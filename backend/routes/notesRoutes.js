const express = require("express");
const router  = express.Router();

const { saveNote, getNote, deleteNote } = require("../controllers/notesController");
const { protect } = require("../middleware/authMiddleware");

/**
 * Notes Routes
 * Base path: /api/notes  (mounted in server.js)
 * All routes are protected — a valid JWT is required.
 */

// Apply protect to every route in this file
router.use(protect);

// @route  POST /api/notes              — Create or update a note (upsert / auto-save)
router.post("/", saveNote);

// @route  GET  /api/notes/:videoId     — Fetch the note for a specific video
router.get("/:videoId", getNote);

router.delete("/:videoId", deleteNote);

module.exports = router;
