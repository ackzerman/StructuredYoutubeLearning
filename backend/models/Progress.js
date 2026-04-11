const mongoose = require("mongoose");

/**
 * Progress Model
 * Tracks a specific user's watch progress for a specific video.
 * The compound unique index ensures there is exactly one Progress
 * record per (user, video) pair — no duplicates possible.
 *
 * Relationships:
 *   Many Progress records → One User   (via userId)
 *   Many Progress records → One Video  (via videoId)
 */
const progressSchema = new mongoose.Schema(
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

    // How many seconds the user has watched so far
    watchedSeconds: {
      type: Number,
      default: 0,
    },

    // True once the user has watched enough to mark the video done
    completed: {
      type: Boolean,
      default: false,
    },

    // Timestamp of the most recent watch session
    lastWatchedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — guarantees one progress record per user per video
progressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);
