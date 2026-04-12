const Video        = require("../models/Video");
const Progress     = require("../models/Progress");
const DailyActivity = require("../models/DailyActivity");
const User         = require("../models/User");
const AppError     = require("../utils/AppError");
const { getTodayString, calculateStreak } = require("../utils/dateHelpers");

// ─── Update Video Progress ────────────────────────────────────────────────────

/**
 * @route   POST /api/progress
 * @desc    Record watch progress for a video, update daily activity and streak.
 *          Safe to call repeatedly — uses max() for watchedSeconds and
 *          upserts DailyActivity to prevent duplicate inflation.
 * @access  Protected
 *
 * Body: {
 *   videoId        : string  (required)
 *   watchedSeconds : number  (required, >= 0)
 * }
 */
const updateProgress = async (req, res, next) => {
  try {
    const userId                   = req.userId;
    const { videoId, watchedSeconds } = req.body;

    // ── 1. Validate input ─────────────────────────────────────────────────────

    if (!videoId) {
      return next(new AppError("videoId is required.", 400));
    }

    if (typeof watchedSeconds !== "number" || watchedSeconds < 0) {
      return next(new AppError("watchedSeconds must be a non-negative number.", 400));
    }

    // ── 2. Load the video to know its full duration ───────────────────────────

    const video = await Video.findById(videoId);
    if (!video) {
      return next(new AppError("Video not found.", 404));
    }

    // ── 3. Load or create the Progress record for this user + video ───────────

    let progress = await Progress.findOne({ userId, videoId });

    const isNewProgress = !progress;

    if (isNewProgress) {
      progress = new Progress({ userId, videoId, watchedSeconds: 0, completed: false });
    }

    // ── 4. Calculate the delta before updating ────────────────────────────────
    // Delta = how many NEW seconds were watched since the last call.
    // This prevents double-counting when the client sends the same position twice.

    const previousSeconds = progress.watchedSeconds;
    const newWatchedSeconds = Math.max(previousSeconds, watchedSeconds);
    const deltaSeconds = newWatchedSeconds - previousSeconds; // 0 if no new progress

    // ── 5. Update progress fields ─────────────────────────────────────────────

    progress.watchedSeconds = newWatchedSeconds;
    progress.lastWatchedAt  = new Date();

    // Mark complete when >= 90% of the video has been watched
    const completionThreshold = video.duration * 0.9;
    const justCompleted =
      !progress.completed && progress.watchedSeconds >= completionThreshold;

    if (justCompleted) {
      progress.completed = true;
    }

    await progress.save();

    // ── 6. Update DailyActivity ───────────────────────────────────────────────
    // Only record activity when there are genuinely new seconds watched.

    const today = getTodayString();

    if (deltaSeconds > 0 || isNewProgress) {
      // findOneAndUpdate with upsert avoids race conditions and duplicate docs.
      // $inc atomically increments both counters in a single DB operation.
      await DailyActivity.findOneAndUpdate(
        { userId, date: today },
        {
          $inc: {
            videosWatchedCount: isNewProgress ? 1 : 0, // Count each video once per day
            totalWatchSeconds:  deltaSeconds,
          },
        },
        { upsert: true, new: true }
      );
    }

    // ── 7. Update streak ──────────────────────────────────────────────────────

    const user = await User.findById(userId);
    const { newStreak, shouldUpdate } = calculateStreak(user.lastActiveDate, user.streak);

    if (shouldUpdate) {
      user.streak         = newStreak;
      user.lastActiveDate = new Date();
      await user.save();
    }

    // ── 8. Respond ────────────────────────────────────────────────────────────

    res.status(200).json({
      progress,
      streak:    user.streak,
      completed: progress.completed,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateProgress };
