const mongoose = require("mongoose");

/**
 * Course Model
 * Represents a learning course created by a user.
 * A course can be imported from a YouTube playlist or created manually.
 * It acts as the parent container for all Videos.
 *
 * Relationships:
 *   Many Courses → One User   (via userId)
 *   One Course   → many Videos
 */
const courseSchema = new mongoose.Schema(
  {
    // The user who created and owns this course
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },

    // How the course was created
    source: {
      type: String,
      enum: {
        values: ["youtube", "manual"],
        message: 'Source must be either "youtube" or "manual"',
      },
      required: [true, "Course source is required"],
    },

    // Only populated when source is "youtube"
    playlistUrl: {
      type: String,
      default: null,
    },

    // Flexible labels for filtering/searching courses
    tags: {
      type: [String],
      default: [],
    },

    // Denormalised counts — updated whenever videos are added/removed
    totalVideos: {
      type: Number,
      default: 0,
    },

    // Total duration of all videos in seconds
    totalDuration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for fast lookup of all courses belonging to a user
courseSchema.index({ userId: 1 });

module.exports = mongoose.model("Course", courseSchema);
