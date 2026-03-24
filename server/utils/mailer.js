const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendTaskReminder = async (email, taskTitle, timeString) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🔔 Task Reminder: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #8A2BE2;">Task Reminder</h2>
          <p>Hi there,</p>
          <p>This is a reminder for your task: <strong>${taskTitle}</strong></p>
          <p>Scheduled to start at: <strong>${timeString}</strong> (in about 30 minutes).</p>
          <p>Good luck!</p>
          <hr />
          <p style="font-size: 12px; color: #777;">Sent automatically by VoxAI Task Assistant</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email} for task: ${taskTitle}`);
    return true;
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    return false;
  }
};

module.exports = { sendTaskReminder };
