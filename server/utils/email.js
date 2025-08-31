let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  console.warn('Nodemailer not available - email functionality disabled');
  nodemailer = null;
}

const sendEmail = async (options) => {
  // Skip email sending if nodemailer is not available
  if (!nodemailer) {
    console.log('Email would be sent to:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:', options.message);
    return Promise.resolve();
  }

  // 1) Create a transporter
  let transporter;
  
  if (process.env.NODE_ENV === 'production') {
    // Production - use a real email service
    // You can use Gmail, SendGrid, Mailgun, etc.
    transporter = nodemailer.createTransport({
      service: 'Gmail', // or your preferred service
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    // Development - use Mailtrap or similar
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // 2) Define the email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Construction Tracker <noreply@constructiontracker.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
