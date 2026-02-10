const axios = require("axios");
require("dotenv").config();
const nodemailer = require("nodemailer");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

transporter
  .verify()
  .then(() => console.log("✅ SMTP ready"))
  .catch((e) => console.log("❌ SMTP error:", e?.message || e));

async function sendOtpEmail(toEmail, otp) {
  await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        name: "RealChat",
        email: process.env.SMTP_FROM.match(/<(.*)>/)[1],
      },
      to: [{ email: toEmail }],
      subject: "OTP Code — RealChat",
      htmlContent: `
        <div style="font-family:Arial">
          <h2>RealChat OTP Code</h2>
          <h1>${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );

  console.log("✅ OTP email göndərildi:", toEmail);
}

module.exports = { sendOtpEmail };