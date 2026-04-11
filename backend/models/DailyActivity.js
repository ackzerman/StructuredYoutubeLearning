const mongoose = require("mongoose");

/**
 * DailyActivity Model
 * Aggregates a user's learning activity for a single calendar day.
 * Used to power the streak system and activity heatmaps/dashboards.
 *
 * Date is stored as a "YYYY-MM-DD" string (not a Date object) to make
 * daily bucketing simple and timezone-safe on the application layer.
 *
 * The compound unique index ensures one record per (user, day).
 *
 * Relationships:
 *   Many DailyActivity records → One User (via userId)
 */
const dailyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    // Calendar day in YYYY-MM-DD format, e.g. "2024-07-15"
    date: {
      type: String,
      required: [true, "Date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },

    // How many distinct videos were watched on this day
    videosWatchedCount: {
      type: Number,
      default: 0,
    },

    // Total seconds watched across all videos on this day
    totalWatchSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — one activity record per user per calendar day
dailyActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyActivity", dailyActivitySchema);
