const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// Make email service optional to prevent deployment failures
let sendEmail;
try {
    sendEmail = require('../utils/email');
} catch (err) {
    console.warn('Email service not available - password reset will return token instead');
    sendEmail = null;
}

const signToken = (id) => {
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,
        phone: req.body.phone
    });
    
    createSendToken(newUser, 201, res);
});

// Forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next(new AppError('Please provide your email', 400));

    const user = await User.findOne({ email });
    if (!user) {
        return next(new AppError('There is no user with that email address.', 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // TODO: send resetToken via email provider
    // For now, return token so we can test the flow
    // Send email with reset URL or return token if email service unavailable
    if (sendEmail) {
        try {
            const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
            
            await sendEmail({
                email: user.email,
                subject: 'Your password reset token (valid for 10 min)',
                message: `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`,
                html: `
                    <h2>Password Reset Request</h2>
                    <p>You requested a password reset for your Construction Tracker account.</p>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetURL}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    <p>This link will expire in 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `
            });

            res.status(200).json({
                status: 'success',
                message: 'Token sent to email!'
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return next(new AppError('There was an error sending the email. Try again later.', 500));
        }
    } else {
        // Email service not available - return token for testing
        res.status(200).json({
            status: 'success',
            message: 'Email service not configured. Use this token for testing:',
            resetToken
        });
    }
});

// Reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    
    // 1) Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }
    
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }
    
    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
});

// Protect routes middleware
exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check if it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return next(
            new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }
    
    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError('The user belonging to this token no longer exists.', 401)
        );
    }
    
    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError('User recently changed password! Please log in again.', 401)
        );
    }
    
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
});

// Restrict to certain roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'manager']. role='user'
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action', 403)
            );
        }
        next();
    };
};
