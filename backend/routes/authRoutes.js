const express = require("express");
const rateLimit = require("express-rate-limit");
const { signup, login, refreshAccessToken, logout } = require("../controllers/authController");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts, please try again later." },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

module.exports = router;