let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  console.warn('Nodemailer not available - email functionality disabled');
  nodemailer = null;
}

const resolveEmailAuth = () => {
  const user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
  return { user, pass };
};

const resolveEmailFrom = () => {
  const { user } = resolveEmailAuth();
  return process.env.EMAIL_FROM || user || 'Construction Tracker <noreply@constructiontracker.com>';
};

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
  const { user, pass } = resolveEmailAuth();

  if (process.env.NODE_ENV === 'production') {
    if (process.env.EMAIL_HOST && user && pass) {
      const effectivePort = Number(process.env.EMAIL_PORT) || 587;
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: effectivePort,
        secure: effectivePort === 465,
        auth: { user, pass },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
      });
    }
  } else {
    // Development - use Mailtrap or similar
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user,
        pass,
      },
    });
  }

  // 2) Define the email options
  const mailOptions = {
    from: resolveEmailFrom(),
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
