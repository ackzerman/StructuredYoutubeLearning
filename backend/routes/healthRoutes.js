const express = require("express");
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check — confirms the server is running
 * @access  Public
 */
router.get("/", (req, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = router;
