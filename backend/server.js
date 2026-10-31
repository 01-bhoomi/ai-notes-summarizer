const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const autoPurgeOldTrash = require("./utils/autoPurge");

dotenv.config();
connectDB();

// Run purge check once on server start, then every 24 hours
autoPurgeOldTrash();
setInterval(autoPurgeOldTrash, 24 * 60 * 60 * 1000);

const app = express();

// Render runs behind a proxy; needed so rate-limit sees the real client IP
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

const sanitizeBody = (req, res, next) => {
  const clean = (obj) => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (key.startsWith("$") || key.includes(".")) {
          delete obj[key];
        } else if (typeof obj[key] === "object") {
          clean(obj[key]);
        }
      }
    }
  };
  clean(req.body);
  next();
};

app.use(sanitizeBody);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { message: "Too many requests, please try again later." },
});

app.use("/api", limiter);

app.get("/", (req, res) => {
  res.send("AI Notes Summarizer API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));