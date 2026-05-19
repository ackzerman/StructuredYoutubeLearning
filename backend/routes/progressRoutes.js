const express = require("express");
const router  = express.Router();

const { updateProgress, toggleStar } = require("../controllers/progressController");
const { protect }        = require("../middleware/authMiddleware");

/**
 * Progress Routes
 * Base path: /api/progress  (mounted in server.js)
 */

// @route  POST /api/progress — Record watch progress, update activity + streak
router.post("/", protect, updateProgress);


// @route  PATCH /api/progress/:videoId/star      — Toggle starred flag for a video
router.patch("/:videoId/star", protect, toggleStar);

module.exports = router;
