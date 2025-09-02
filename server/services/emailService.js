const nodemailer = require('nodemailer');
const AppError = require('../utils/appError');

// Create a test account (for development only)
const createTestAccount = async () => {
  return await nodemailer.createTestAccount();
};

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME || 'test@example.com',
    pass: process.env.EMAIL_PASSWORD || 'test123'
  }
});

// Send work order assignment email
exports.sendWorkOrderAssignedEmail = async (worker, workOrder, assignedBy) => {
  try {
    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== EMAIL NOTIFICATION (Development Mode) ===`);
      console.log(`To: ${worker.email}`);
      console.log(`Subject: New Work Order Assignment - ${workOrder.description}`);
      console.log(`You have been assigned to a new work order.`);
      console.log(`Work Order ID: ${workOrder._id}`);
      console.log(`Description: ${workOrder.description}`);
      console.log(`Assigned by: ${assignedBy.name}`);
      console.log(`======================================\n`);
      return { previewUrl: 'Email logged in console (development mode)' };
    }

    // In production, send actual email
    const info = await transporter.sendMail({
      from: `"Construction Tracker" <${process.env.EMAIL_FROM || 'noreply@constructiontracker.com'}>`,
      to: worker.email,
      subject: `New Work Order Assignment - ${workOrder.description}`,
      text: `Hello ${worker.name},

You have been assigned to a new work order:

Work Order ID: ${workOrder._id}
Description: ${workOrder.description}
Priority: ${workOrder.priority}
Scheduled Date: ${workOrder.scheduledDate}

Assigned by: ${assignedBy.name}

Please log in to the Construction Tracker system for more details.

Best regards,
Construction Tracker Team`,
      html: `
        <div>
          <p>Hello ${worker.name},</p>
          <p>You have been assigned to a new work order:</p>
          <p><strong>Work Order ID:</strong> ${workOrder._id}<br>
          <strong>Description:</strong> ${workOrder.description}<br>
          <strong>Priority:</strong> ${workOrder.priority}<br>
          <strong>Scheduled Date:</strong> ${workOrder.scheduledDate}</p>
          <p><strong>Assigned by:</strong> ${assignedBy.name}</p>
          <p>Please log in to the Construction Tracker system for more details.</p>
          <p>Best regards,<br>Construction Tracker Team</p>
        </div>
      `
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
    return { previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new AppError('Failed to send email notification', 500);
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== PASSWORD RESET EMAIL (Development Mode) ===`);
      console.log(`To: ${user.email}`);
      console.log(`Subject: Password Reset Request`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`This link will expire in 10 minutes.`);
      console.log(`==========================================\n`);
      return { previewUrl: 'Password reset email logged in console (development mode)' };
    }

    // In production, send actual email
    const info = await transporter.sendMail({
      from: `"Construction Tracker" <${process.env.EMAIL_FROM || 'noreply@constructiontracker.com'}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You are receiving this email because you (or someone else) has requested a password reset for your account.\n\nPlease click on the following link to complete the process:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div>
          <p>You are receiving this email because you (or someone else) has requested a password reset for your account.</p>
          <p>Please click on the following link to complete the process:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    console.log('Password reset email sent: %s', info.messageId);
    return { previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new AppError('Failed to send password reset email', 500);
  }
};

// Test email service connection
exports.verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Server is ready to take our messages');
    return { status: 'success', message: 'Email service is ready' };
  } catch (error) {
    console.error('Email service connection failed:', error);
    throw new AppError('Failed to connect to email service', 500);
  }
};

// Initialize email service (for testing on startup)
const initEmailService = async () => {
  if (process.env.NODE_ENV === 'development') {
    const testAccount = await createTestAccount();
    console.log('Test email account created:', testAccount.user);
    console.log('Ethereal test URL:', nodemailer.getTestMessageUrl({}));
  }
  
  await exports.verifyEmailConnection();
};

// Auto-initialize in development (disabled for local testing)
// if (process.env.NODE_ENV === 'development') {
//   initEmailService().catch(console.error);
// }

module.exports = exports;
