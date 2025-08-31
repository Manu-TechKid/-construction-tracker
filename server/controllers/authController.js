const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
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
  const { name, email, password, passwordConfirm, role, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError('User with this email already exists', 400));
  }

  // Validate password confirmation
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  // Create user data
  const userData = {
    name,
    email: email.toLowerCase(),
    password,
    phone,
    role: role || 'worker' // Default to worker
  };

  // If registering as worker, initialize worker profile
  if (userData.role === 'worker') {
    userData.workerProfile = {
      skills: [],
      paymentType: 'hourly',
      status: 'active',
      approvalStatus: 'pending', // Self-registered workers need approval
      notes: 'Self-registered worker - pending approval'
    };
  }

  const newUser = await User.create(userData);

  // If worker registration, notify admins
  if (newUser.role === 'worker') {
    await notifyAdminsOfWorkerRegistration(newUser);
    
    // Send different response for pending workers
    res.status(201).json({
      status: 'success',
      message: 'Registration successful! Your account is pending admin approval.',
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          approvalStatus: newUser.workerProfile.approvalStatus
        }
      }
    });
  } else {
    createSendToken(newUser, 201, res);
  }
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

  // 3) Check if worker is approved
  if (user.role === 'worker' && user.workerProfile?.approvalStatus !== 'approved') {
    const statusMessages = {
      pending: 'Your account is pending admin approval. Please wait for approval.',
      rejected: 'Your account has been rejected. Please contact administration.'
    };
    
    return next(new AppError(statusMessages[user.workerProfile.approvalStatus] || 'Account not approved', 403));
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
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // 5) Check if worker is still approved
  if (currentUser.role === 'worker' && currentUser.workerProfile?.approvalStatus !== 'approved') {
    return next(new AppError('Your worker account is no longer approved.', 403));
  }

  // 6) Check if user is still active
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated.', 403));
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
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
