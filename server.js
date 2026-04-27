const express = require("express");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = process.env.VERCEL === "1";
const SHOULD_PERSIST_MESSAGES =
  !IS_VERCEL && process.env.PERSIST_CONTACT_MESSAGES !== "false";
const DATA_DIR = path.join(__dirname, "data");
const MESSAGES_FILE = path.join(DATA_DIR, "contacts.json");

if (SHOULD_PERSIST_MESSAGES) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, "[]", "utf8");
  }
}

const CONTACT_RECEIVER_EMAIL =
  process.env.CONTACT_RECEIVER_EMAIL || "sirajuddinkhan7718@gmail.com";
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "portfolio";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "contacts";

let mailTransporter = null;
let mongoClientPromise = null;

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

const getMongoCollection = async () => {
  if (!MONGODB_URI) {
    return null;
  }

  if (!mongoClientPromise) {
    const mongoClient = new MongoClient(MONGODB_URI, {
      // Small serverless-friendly pool for this portfolio API.
      maxPoolSize: IS_VERCEL ? 5 : 20,
      minPoolSize: IS_VERCEL ? 0 : 2,
      maxIdleTimeMS: IS_VERCEL ? 20000 : 300000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000,
    });

    mongoClientPromise = mongoClient.connect();
  }

  const mongoClient = await mongoClientPromise;
  return mongoClient.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION);
};

const readMessages = () => {
  if (!SHOULD_PERSIST_MESSAGES) {
    return [];
  }

  try {
    const raw = fs.readFileSync(MESSAGES_FILE, "utf8").trim();

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // If the file is corrupted, keep the API running and start fresh.
    return [];
  }
};

const writeMessages = (messages) => {
  if (!SHOULD_PERSIST_MESSAGES) {
    return;
  }

  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
};

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
    id: Date.now(),
    name: String(name).trim(),
    email: String(email).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    let storedInMongo = false;
    let storedInFile = false;
    let emailSent = false;

    try {
      const contactsCollection = await getMongoCollection();
      if (contactsCollection) {
        await contactsCollection.insertOne(entry);
        storedInMongo = true;
      }
    } catch (mongoError) {
      console.error(
        "Failed to store contact message in MongoDB:",
        mongoError.message,
      );
    }

    if (!storedInMongo && SHOULD_PERSIST_MESSAGES) {
      const current = readMessages();
      current.push(entry);
      writeMessages(current);
      storedInFile = true;
    }

    if (mailTransporter) {
      try {
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

        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send contact email:", emailError.message);
      }
    }

    if (emailSent && (storedInMongo || storedInFile)) {
      return res.status(201).json({
        ok: true,
        message: "Message sent and saved successfully.",
        id: entry.id,
      });
    }

    if (emailSent) {
      return res.status(201).json({
        ok: true,
        message: "Message sent successfully.",
        id: entry.id,
      });
    }

    if (storedInMongo || storedInFile) {
      return res.status(201).json({
        ok: true,
        message:
          "Message stored successfully. Configure SMTP env vars to enable email delivery.",
        id: entry.id,
      });
    }

    return res.status(500).json({
      ok: false,
      error:
        "Unable to process message. Configure SMTP and/or MongoDB to enable contact delivery.",
    });
  } catch (error) {
    console.error("Failed to process contact message:", error.message);
    return res.status(500).json({
      ok: false,
      error: "Failed to save your message. Please try again later.",
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
