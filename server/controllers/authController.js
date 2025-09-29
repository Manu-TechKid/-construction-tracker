const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '30d',
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || process.env.JWT_COOKIE_EXPIRES_IN || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Validate password confirmation
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  // Create user data - ALL registrations are pending approval
  const userData = {
    name,
    email: email.toLowerCase(),
    password,
    phone,
    role: 'pending', // All users start as pending
    isActive: false, // Account inactive until approved
    approvalStatus: 'pending'
  };

  // Initialize worker profile for all registrations (admin will assign final role)
  userData.workerProfile = {
    skills: [],
    paymentType: 'hourly',
    status: 'inactive',
    approvalStatus: 'pending',
    notes: 'Registration pending admin approval - role to be assigned'
  };

  const newUser = await User.create(userData);

  // Notify admins of new registration
  await notifyAdminsOfWorkerRegistration(newUser);
  
  // Send response for pending approval
  res.status(201).json({
    status: 'success',
    message: 'Registration submitted successfully! Your account is pending admin approval.',
    data: {
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        approvalStatus: newUser.approvalStatus
      }
    }
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if user is approved (applies to ALL users now)
  if (user.role === 'pending' || user.approvalStatus === 'pending') {
    return next(new AppError('Your account is pending admin approval. Please wait for approval.', 403));
  }
  
  if (user.approvalStatus === 'rejected') {
    return next(new AppError('Your account has been rejected. Please contact administration.', 403));
  }

  // 4) Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact administration.', 403));
  }

  // 5) Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // 6) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  console.log('=== AUTH PROTECT MIDDLEWARE ===');
  console.log('Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token from Authorization header:', token ? 'Found' : 'Not found');
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
    console.log('Token from cookies:', token ? 'Found' : 'Not found');
  }

  console.log('Final token:', token ? 'Present' : 'Missing');

  if (!token) {
    console.log('No token found, returning 401');
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  console.log('User lookup result:', {
    found: !!currentUser,
    id: decoded.id,
    role: currentUser?.role,
    approvalStatus: currentUser?.workerProfile?.approvalStatus,
    isActive: currentUser?.isActive
  });
  
  if (!currentUser) {
    console.log('User not found in database');
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    console.log('Password changed after token issued');
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // 5) Check if worker is still approved (allow pending workers to access basic features)
  if (currentUser.role === 'worker' && 
      currentUser.workerProfile?.approvalStatus !== 'approved' && 
      currentUser.workerProfile?.approvalStatus !== 'pending') {
    console.log('Worker not approved:', {
      role: currentUser.role,
      approvalStatus: currentUser.workerProfile?.approvalStatus
    });
    return next(new AppError('Your worker account is no longer approved.', 403));
  }

  // 6) Check if user is still active
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated.', 403));
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  console.log('Auth middleware completed successfully for user:', currentUser.name);
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Helper function to notify admins of worker registration
async function notifyAdminsOfWorkerRegistration(worker) {
  try {
    // Find all admin and manager users
    const admins = await User.find({ 
      role: { $in: ['admin', 'manager'] },
      isActive: true 
    }).select('email name');

    // Send notification emails
    const emailPromises = admins.map(admin => {
      return sendEmail({
        email: admin.email,
        subject: 'New Worker Registration - Approval Required',
        message: `
          Hello ${admin.name},
          
          A new worker has registered and requires approval:
          
          Name: ${worker.name}
          Email: ${worker.email}
          Phone: ${worker.phone || 'Not provided'}
          
          Please log in to the admin panel to review and approve this worker.
          
          Best regards,
          Construction Tracker System
        `
      });
    });

    await Promise.allSettled(emailPromises);
    console.log(`Notified ${admins.length} admins of new worker registration: ${worker.email}`);
    
  } catch (error) {
    console.error('Failed to notify admins of worker registration:', error);
    // Don't throw error - registration should still succeed
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message: `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later.'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // 1) Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('Please provide current password, new password, and confirmation', 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError('New password and confirmation do not match', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters long', 400));
  }

  // 2) Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // 3) Check if current password is correct
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // 4) Update password
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  // 5) Log user in with new password, send JWT
  createSendToken(user, 200, res);
});
