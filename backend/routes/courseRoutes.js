const express = require("express");
const router = express.Router();

const {
  createManualCourse,
  getCourses,
  getCourseById,
  importYoutubeCourse,
} = require("../controllers/courseController");

const { protect } = require("../middleware/authMiddleware");

/**
 * Course Routes
 * Base path: /api/courses  (mounted in server.js)
 * All routes are protected — a valid JWT is required for every request.
 */

// Apply protect middleware to every route in this file
router.use(protect);

// @route  POST /api/courses/manual  — Create a manual course with videos
router.post("/manual", createManualCourse);

// @route  GET  /api/courses         — Get all courses for the logged-in user
router.get("/", getCourses);

// @route  POST /api/courses/youtube  — Import a course from a YouTube playlist
router.post("/youtube", importYoutubeCourse);

// @route  GET  /api/courses/:id     — Get a single course with its videos
router.get("/:id", getCourseById);

module.exports = router;