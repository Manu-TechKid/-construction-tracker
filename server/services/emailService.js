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

// Send invoice email to client
exports.sendInvoiceEmail = async (invoice, emailAddresses, customMessage = '') => {
  try {
    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== INVOICE EMAIL (Development Mode) ===`);
      console.log(`To: ${emailAddresses.join(', ')}`);
      console.log(`Subject: Invoice ${invoice.invoiceNumber} from DSJ Construction Services`);
      console.log(`Invoice Number: ${invoice.invoiceNumber}`);
      console.log(`Client: ${invoice.client?.companyName}`);
      console.log(`Building: ${invoice.building?.name}`);
      console.log(`Total: $${invoice.total?.toFixed(2)}`);
      console.log(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`);
      if (customMessage) {
        console.log(`Message: ${customMessage}`);
      }
      console.log(`======================================\n`);
      return { previewUrl: 'Invoice email logged in console (development mode)' };
    }

    // In production, send actual email
    const info = await transporter.sendMail({
      from: `"DSJ Construction Services" <${process.env.EMAIL_FROM || 'noreply@constructiontracker.com'}>`,
      to: emailAddresses,
      subject: `Invoice ${invoice.invoiceNumber} from DSJ Construction Services`,
      text: `Dear ${invoice.client?.contactName || 'Valued Customer'},

Please find attached your invoice ${invoice.invoiceNumber} from DSJ Construction Services.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Building: ${invoice.building?.name}
- Total Amount: $${invoice.total?.toFixed(2)}
- Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}

${customMessage ? `Message: ${customMessage}` : ''}

Payment is due within 30 days of the invoice date. Late payments may incur additional charges.

To view the invoice details, please log in to our client portal or contact us directly.

Thank you for your business!

Best regards,
DSJ Construction Services Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 10px;">DSJ Construction Services</h1>
            <p style="color: #666; margin: 0;">Professional Construction Management</p>
          </div>

          <div style="padding: 20px;">
            <p>Dear ${invoice.client?.contactName || 'Valued Customer'},</p>

            <p>Please find attached your invoice ${invoice.invoiceNumber} from DSJ Construction Services.</p>

            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #333;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Building:</strong> ${invoice.building?.name}</p>
              <p><strong>Total Amount:</strong> $${invoice.total?.toFixed(2)}</p>
              <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
            </div>

            ${customMessage ? `<p><strong>Message:</strong> ${customMessage}</p>` : ''}

            <p>Payment is due within 30 days of the invoice date. Late payments may incur additional charges.</p>

            <p>To view the invoice details, please log in to our client portal or contact us directly.</p>

            <p>Thank you for your business!</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Best regards,<br>
              <strong>DSJ Construction Services Team</strong>
            </p>
          </div>
        </div>
      `
    });

    console.log('Invoice email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    return { previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw new AppError('Failed to send invoice email', 500);
  }
};
