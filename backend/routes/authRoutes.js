const express = require("express");
const router = express.Router();

const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

/**
 * Auth Routes
 * Base path: /api/auth  (mounted in server.js)
 */

// @route  POST /api/auth/register — Create a new account
router.post("/register", registerUser);

// @route  POST /api/auth/login    — Authenticate and receive a token
router.post("/login", loginUser);

// @route  GET  /api/auth/me       — Get current user (JWT required)
router.get("/me", protect, getMe);

module.exports = router;
