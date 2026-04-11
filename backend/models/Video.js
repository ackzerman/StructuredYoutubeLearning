const mongoose = require("mongoose");

/**
 * Video Model
 * Represents a single video lesson within a Course.
 * Stores the URL, duration, and its position in the course playlist.
 *
 * Relationships:
 *   Many Videos → One Course  (via courseId)
 *   One Video   → many Progress records (one per user)
 *   One Video   → many Notes (one per user)
 */
const videoSchema = new mongoose.Schema(
  {
    // The course this video belongs to
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },

    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
    },

    // Direct link to the video (YouTube URL or external source)
    videoUrl: {
      type: String,
      default: "",
    },

    // Length of the video in seconds
    duration: {
      type: Number,
      required: [true, "Video duration is required"],
    },

    // Position of this video within its course (0-based or 1-based)
    orderIndex: {
      type: Number,
      required: [true, "Order index is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast retrieval of all videos within a course
videoSchema.index({ courseId: 1 });

module.exports = mongoose.model("Video", videoSchema);
