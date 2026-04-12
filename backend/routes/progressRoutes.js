const express = require("express");
const router  = express.Router();

const { updateProgress } = require("../controllers/progressController");
const { protect }        = require("../middleware/authMiddleware");

/**
 * Progress Routes
 * Base path: /api/progress  (mounted in server.js)
 */

// @route  POST /api/progress — Record watch progress, update activity + streak
router.post("/", protect, updateProgress);

module.exports = router;
