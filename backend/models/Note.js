const mongoose = require("mongoose");

/**
 * Note Model
 * Stores a user's personal notes for a specific video.
 * Designed as a single editable document per (user, video) pair —
 * the compound unique index enforces this constraint.
 *
 * Notes are upserted (created or updated) rather than appended,
 * keeping the data model simple and queries fast.
 *
 * Relationships:
 *   Many Notes → One User  (via userId)
 *   Many Notes → One Video (via videoId)
 */
const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: [true, "Video ID is required"],
    },

    // The note body — empty string means the user cleared their notes
    content: {
      type: String,
      default: "",
    },

    // Manually managed so it reflects the last edit time specifically
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }
  // No timestamps:true here — updatedAt is managed manually above
);

// Compound unique index — one note document per user per video
noteSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("Note", noteSchema);
