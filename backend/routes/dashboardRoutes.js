const express = require("express");
const router  = express.Router();

const { getDashboard } = require("../controllers/dashboardController");
const { protect }      = require("../middleware/authMiddleware");

/**
 * Dashboard Routes
 * Base path: /api/dashboard  (mounted in server.js)
 */

// @route  GET /api/dashboard — Aggregate all dashboard data for the current user
router.get("/", protect, getDashboard);

module.exports = router;
