const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = process.env.VERCEL === "1";

const CONTACT_RECEIVER_EMAIL =
  process.env.CONTACT_RECEIVER_EMAIL || "sirajuddinkhan7718@gmail.com";

let mailTransporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  const smtpPassword = process.env.SMTP_PASS.replace(/\s+/g, "");

  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPassword,
    },
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "portfolio-api" });
});

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      ok: false,
      error: "Please provide name, email, and message.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      ok: false,
      error: "Please enter a valid email address.",
    });
  }

  const entry = {
    name: String(name).trim(),
    email: String(email).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    if (!mailTransporter) {
      return res.status(500).json({
        ok: false,
        error:
          "Email delivery is not configured. Please set SMTP environment variables.",
      });
    }

    await mailTransporter.sendMail({
      from: `Portfolio Contact <${process.env.SMTP_USER}>`,
      to: CONTACT_RECEIVER_EMAIL,
      subject: `New portfolio message from ${entry.name}`,
      replyTo: entry.email,
      text: [
        `Name: ${entry.name}`,
        `Email: ${entry.email}`,
        "",
        "Message:",
        entry.message,
        "",
        `Sent at: ${entry.createdAt}`,
      ].join("\n"),
    });

    return res.status(201).json({
      ok: true,
      message: "Message sent successfully.",
    });
  } catch (error) {
    console.error("Failed to send contact email:", error.message);
    return res.status(500).json({
      ok: false,
      error: "Failed to send your message. Please try again later.",
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (IS_VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Portfolio server running on http://localhost:${PORT}`);
  });
}
