const nodemailer = require('nodemailer');
const AppError = require('../utils/appError');

// Create a test account (for development only)
const createTestAccount = async () => {
  return await nodemailer.createTestAccount();
};

const resolveEmailAuth = () => {
  const user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
  const passFromEmailPassword = process.env.EMAIL_PASSWORD;
  const passFromEmailPass = process.env.EMAIL_PASS ? String(process.env.EMAIL_PASS).replace(/\s+/g, '') : undefined;
  const pass = passFromEmailPassword || passFromEmailPass;
  return { user, pass };
};

const resolveEmailFrom = () => {
  const { user } = resolveEmailAuth();
  return process.env.EMAIL_FROM || user || 'noreply@constructiontracker.com';
};

const hasEmailConfig = () => {
  const { user, pass } = resolveEmailAuth();
  return Boolean(user && pass);
};

const isGmailImplicitConfig = () => {
  const { user, pass } = resolveEmailAuth();
  return Boolean(user && pass && !process.env.EMAIL_HOST);
};

const createGmail587Transporter = () => {
  const { user, pass } = resolveEmailAuth();
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS) || 10000,
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS) || 20000,
  });
};

const sendViaResend = async ({ to, subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Resend request failed with status ${response.status}`;
    const err = new Error(errorMessage);
    err.status = response.status;
    err.provider = 'resend';
    err.response = data;
    throw err;
  }

  return data;
};

const createTransporter = () => {
  const { user, pass } = resolveEmailAuth();
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);

  if (host && user && pass) {
    const effectivePort = port || 587;
    return nodemailer.createTransport({
      host,
      port: effectivePort,
      secure: effectivePort === 465,
      auth: { user, pass },
      connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS) || 10000,
      greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS) || 10000,
      socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS) || 20000,
    });
  }

  if (user && pass) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS) || 10000,
      greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS) || 10000,
      socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS) || 20000,
    });
  }

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'test123',
    },
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS) || 10000,
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS) || 20000,
  });
};

const transporter = createTransporter();

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

    const info = await transporter.sendMail({
      from: `"Construction Tracker" <${resolveEmailFrom()}>`,
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
    const baseClientUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${baseClientUrl}/reset-password/${resetToken}`;
    
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

    if (process.env.RESEND_API_KEY) {
      console.log('[sendPasswordResetEmail] Sending via Resend');
      try {
        await sendViaResend({
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
          `,
        });
        console.log('[sendPasswordResetEmail] Resend accepted request');
        return { previewUrl: 'Email sent via Resend' };
      } catch (resendErr) {
        console.error('[sendPasswordResetEmail] Resend send failed, falling back to SMTP/logging', {
          message: resendErr?.message,
          status: resendErr?.status,
          response: resendErr?.response,
        });
      }
    }

    // If email is not configured in production, log reset link instead of throwing.
    // This keeps the forgot-password flow usable while deploying/configuring SMTP.
    if (!hasEmailConfig()) {
      console.log(`\n=== PASSWORD RESET EMAIL (Email Not Configured) ===`);
      console.log(`To: ${user.email}`);
      console.log(`Subject: Password Reset Request`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Set EMAIL_USER + EMAIL_PASS (or EMAIL_USERNAME + EMAIL_PASSWORD) and EMAIL_FROM to enable sending.`);
      console.log(`===============================================\n`);
      return { previewUrl: 'Password reset email logged in console (email not configured)' };
    }

    const { user: smtpUser, pass: smtpPass } = resolveEmailAuth();
    console.log('[sendPasswordResetEmail] Using SMTP config', {
      nodeEnv: process.env.NODE_ENV,
      hasEmailConfig: hasEmailConfig(),
      hasHost: Boolean(process.env.EMAIL_HOST),
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 465,
      userSet: Boolean(smtpUser),
      passSet: Boolean(smtpPass),
      from: resolveEmailFrom(),
      clientUrl: baseClientUrl,
    });

    // In production, send actual email
    const localTransporter = createTransporter();
    const effectiveFrom = isGmailImplicitConfig() ? (smtpUser || resolveEmailFrom()) : resolveEmailFrom();
    const mailOptions = {
      from: `"Construction Tracker" <${effectiveFrom}>`,
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
    };

    let info;
    try {
      info = await localTransporter.sendMail(mailOptions);
    } catch (sendErr) {
      if (isGmailImplicitConfig()) {
        console.error('[sendPasswordResetEmail] Gmail send failed on default transporter, retrying with 587 STARTTLS', {
          message: sendErr?.message,
          code: sendErr?.code,
          responseCode: sendErr?.responseCode,
          command: sendErr?.command,
        });
        const gmail587 = createGmail587Transporter();
        info = await gmail587.sendMail(mailOptions);
      } else {
        throw sendErr;
      }
    }

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
    if (!hasEmailConfig()) {
      return { status: 'skipped', message: 'Email credentials not configured' };
    }
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

// Send reminder notification email
exports.sendReminderEmail = async (reminder, recipientEmail, recipientName = 'User') => {
  try {
    const dueDate = new Date(reminder.dueDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== REMINDER NOTIFICATION EMAIL (Development Mode) ===`);
      console.log(`To: ${recipientEmail}`);
      console.log(`Subject: Reminder: ${reminder.title}`);
      console.log(`Title: ${reminder.title}`);
      console.log(`Description: ${reminder.description}`);
      console.log(`Due Date: ${dueDate}`);
      console.log(`Priority: ${reminder.priority}`);
      console.log(`Building: ${reminder.building?.name || 'N/A'}`);
      console.log(`======================================\n`);
      return { previewUrl: 'Reminder email logged in console (development mode)' };
    }

    // In production, send actual email
    const info = await transporter.sendMail({
      from: `"Construction Tracker" <${process.env.EMAIL_FROM || 'noreply@constructiontracker.com'}>`,
      to: recipientEmail,
      subject: `Reminder: ${reminder.title}`,
      text: `Hello ${recipientName},

You have a reminder due on ${dueDate}:

Title: ${reminder.title}
Description: ${reminder.description}
Priority: ${reminder.priority.toUpperCase()}
Building: ${reminder.building?.name || 'N/A'}

Please log in to the Construction Tracker system to view and manage this reminder.

Best regards,
Construction Tracker Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 10px;">Construction Tracker</h1>
            <p style="color: #666; margin: 0;">Reminder Notification</p>
          </div>

          <div style="padding: 20px;">
            <p>Hello ${recipientName},</p>

            <p>You have a reminder due on <strong>${dueDate}</strong>:</p>

            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ff9800;">
              <h3 style="margin-top: 0; color: #333;">${reminder.title}</h3>
              <p><strong>Description:</strong> ${reminder.description}</p>
              <p><strong>Priority:</strong> <span style="color: ${reminder.priority === 'high' ? '#d32f2f' : reminder.priority === 'medium' ? '#ff9800' : '#4caf50'};">${reminder.priority.toUpperCase()}</span></p>
              <p><strong>Building:</strong> ${reminder.building?.name || 'N/A'}</p>
            </div>

            <p>Please log in to the Construction Tracker system to view and manage this reminder.</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Best regards,<br>
              <strong>Construction Tracker Team</strong>
            </p>
          </div>
        </div>
      `
    });

    console.log('Reminder email sent: %s', info.messageId);
    return { previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw new AppError('Failed to send reminder email', 500);
  }
};

// Send schedule change notification email to workers
exports.sendScheduleChangeEmail = async (schedule, workers, changeType = 'created', changes = {}) => {
  try {
    const startDate = new Date(schedule.startDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const workerEmails = workers.filter(w => w.email).map(w => w.email);
    
    if (workerEmails.length === 0) {
      console.warn('No valid worker emails found for schedule notification');
      return { previewUrl: 'No worker emails available' };
    }

    // In development, log the email instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== SCHEDULE CHANGE EMAIL (Development Mode) ===`);
      console.log(`To: ${workerEmails.join(', ')}`);
      console.log(`Subject: Schedule ${changeType === 'created' ? 'Created' : 'Updated'}: ${schedule.title}`);
      console.log(`Title: ${schedule.title}`);
      console.log(`Building: ${schedule.building?.name || 'N/A'}`);
      console.log(`Start Date: ${startDate}`);
      console.log(`Type: ${schedule.type}`);
      console.log(`Change Type: ${changeType}`);
      if (Object.keys(changes).length > 0) {
        console.log(`Changes:`, changes);
      }
      console.log(`======================================\n`);
      return { previewUrl: 'Schedule email logged in console (development mode)' };
    }

    // In production, send actual email
    const changeDescription = changeType === 'created' 
      ? 'A new schedule has been created for you'
      : 'Your schedule has been updated with the following changes';

    const info = await transporter.sendMail({
      from: `"Construction Tracker" <${process.env.EMAIL_FROM || 'noreply@constructiontracker.com'}>`,
      to: workerEmails,
      subject: `Schedule ${changeType === 'created' ? 'Created' : 'Updated'}: ${schedule.title}`,
      text: `Hello,

${changeDescription}:

Title: ${schedule.title}
Building: ${schedule.building?.name || 'N/A'}
Type: ${schedule.type}
Start Date: ${startDate}
Description: ${schedule.description || 'N/A'}

${Object.keys(changes).length > 0 ? `Changes:\n${Object.entries(changes).map(([key, value]) => `- ${key}: ${value}`).join('\n')}` : ''}

Please log in to the Construction Tracker system for more details.

Best regards,
Construction Tracker Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin-bottom: 10px;">Construction Tracker</h1>
            <p style="color: #666; margin: 0;">Schedule Notification</p>
          </div>

          <div style="padding: 20px;">
            <p>Hello,</p>

            <p>${changeDescription}:</p>

            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #2196f3;">
              <h3 style="margin-top: 0; color: #333;">${schedule.title}</h3>
              <p><strong>Building:</strong> ${schedule.building?.name || 'N/A'}</p>
              <p><strong>Type:</strong> ${schedule.type}</p>
              <p><strong>Start Date:</strong> ${startDate}</p>
              ${schedule.description ? `<p><strong>Description:</strong> ${schedule.description}</p>` : ''}
            </div>

            ${Object.keys(changes).length > 0 ? `
            <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
              <h4 style="margin-top: 0; color: #856404;">Changes Made:</h4>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${Object.entries(changes).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <p>Please log in to the Construction Tracker system for more details.</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Best regards,<br>
              <strong>Construction Tracker Team</strong>
            </p>
          </div>
        </div>
      `
    });

    console.log('Schedule email sent: %s', info.messageId);
    return { previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    console.error('Error sending schedule email:', error);
    throw new AppError('Failed to send schedule email', 500);
  }
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
