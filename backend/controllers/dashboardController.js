const mongoose    = require("mongoose");
const User         = require("../models/User");
const Course       = require("../models/Course");
const Video        = require("../models/Video");
const Progress     = require("../models/Progress");
const DailyActivity = require("../models/DailyActivity");
const { getTodayString } = require("../utils/dateHelpers");

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/dashboard
 * @desc    Aggregate all data needed for the user's dashboard in one request.
 *          Runs all independent queries in parallel via Promise.all to keep
 *          the response time as low as possible.
 * @access  Protected
 */
const getDashboard = async (req, res, next) => {
  try {
    const userId    = req.userId;
    const userObjId = new mongoose.Types.ObjectId(userId);

    // ── Run all aggregations in parallel ──────────────────────────────────────
    // Independent queries are fired simultaneously rather than sequentially.
    // This cuts total DB round-trip time to the slowest single query.

    const [
      statsResult,
      heatmap,
      continueWatching,
      recentCourses,
      user,
    ] = await Promise.all([
      _getStats(userObjId),
      _getHeatmap(userObjId),
      _getContinueWatching(userObjId),
      _getRecentCourses(userObjId),
      User.findById(userId).select("streak"),
    ]);

    // ── Compose response ──────────────────────────────────────────────────────

    const { totalVideos, videosWatched } = statsResult;

    const completionPercentage =
      totalVideos > 0
        ? Math.round((videosWatched / totalVideos) * 100)
        : 0;

    res.status(200).json({
      stats: {
        totalVideos,
        videosWatched,
        completionPercentage,
        streak: user?.streak ?? 0,
      },
      heatmap,
      continueWatching,
      recentCourses,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: Stats ────────────────────────────────────────────────────────────

/**
 * Returns total videos across all user's courses and completed video count.
 *
 * Pipeline overview (totalVideos):
 *   1. Match all courses owned by this user
 *   2. Look up videos for each course
 *   3. Unwind the joined videos array (one doc per video)
 *   4. Count the total
 *
 * videosWatched uses a simple countDocuments — no join needed because
 * Progress already stores userId directly.
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<{ totalVideos: number, videosWatched: number }>}
 */
const _getStats = async (userObjId) => {
  const [totalVideosResult, videosWatched] = await Promise.all([
    // Aggregate across Course → Video join to get a true total
    Course.aggregate([
      { $match: { userId: userObjId } },
      {
        $lookup: {
          from:         "videos",      // MongoDB collection name (lowercase plural)
          localField:   "_id",
          foreignField: "courseId",
          as:           "videos",
        },
      },
      { $unwind: "$videos" },
      { $count: "total" },
    ]),

    // Simple count — Progress has userId as a direct field
    Progress.countDocuments({ userId: userObjId, completed: true }),
  ]);

  return {
    totalVideos:  totalVideosResult[0]?.total ?? 0,
    videosWatched,
  };
};

// ─── Helper: Heatmap ──────────────────────────────────────────────────────────

/**
 * Returns an array of { date, count } objects for the last 30 days.
 * Dates with no activity are filled with count: 0 so the frontend
 * heatmap always receives a complete, gap-free 30-day window.
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<{ date: string, count: number }[]>}
 */
const _getHeatmap = async (userObjId) => {
  // Build the 30-day date window (inclusive of today)
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10)); // "YYYY-MM-DD"
  }

  const startDate = dates[0];   // 29 days ago
  const endDate   = dates[dates.length - 1]; // today

  // Fetch only the records that exist in this window
  const records = await DailyActivity.find({
    userId: userObjId,
    date:   { $gte: startDate, $lte: endDate },
  }).select("date videosWatchedCount");

  // Build a lookup map for O(1) access: { "2024-07-15": 3, ... }
  const recordMap = {};
  for (const r of records) {
    recordMap[r.date] = r.videosWatchedCount;
  }

  // Merge with the full 30-day window — missing dates get count: 0
  return dates.map((date) => ({
    date,
    count: recordMap[date] ?? 0,
  }));
};

// ─── Helper: Continue Watching ────────────────────────────────────────────────

/**
 * Finds the single most recently watched incomplete video for the user.
 *
 * Aggregation pipeline:
 *   1. Match progress records for this user that have started (watchedSeconds > 0)
 *      and are not yet completed
 *   2. Sort by lastWatchedAt DESC → most recent session first
 *   3. Limit to 1
 *   4. Join Video to get title and duration
 *   5. Join Course (via video.courseId) to get course title
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<object|null>}
 */
const _getContinueWatching = async (userObjId) => {
  const results = await Progress.aggregate([
    // Stage 1 — only in-progress (started but not finished) videos
    {
      $match: {
        userId:         userObjId,
        watchedSeconds: { $gt: 0 },
        completed:      false,
      },
    },

    // Stage 2 — most recently watched first
    { $sort: { lastWatchedAt: -1 } },

    // Stage 3 — we only need the single most recent video
    { $limit: 1 },

    // Stage 4 — join the Video document
    {
      $lookup: {
        from:         "videos",
        localField:   "videoId",
        foreignField: "_id",
        as:           "video",
      },
    },
    { $unwind: "$video" },

    // Stage 5 — join the Course document via the video's courseId
    {
      $lookup: {
        from:         "courses",
        localField:   "video.courseId",
        foreignField: "_id",
        as:           "course",
      },
    },
    { $unwind: "$course" },

    // Stage 6 — project only the fields the frontend needs
    {
      $project: {
        _id:            0,
        videoId:        "$video._id",
        videoTitle:     "$video.title",
        videoUrl:       "$video.videoUrl",
        courseId:       "$course._id",
        courseTitle:    "$course.title",
        watchedSeconds: 1,
        duration:       "$video.duration",
      },
    },
  ]);

  // Return the object directly (not an array), or null if nothing in progress
  return results[0] ?? null;
};

// ─── Helper: Recent Courses ───────────────────────────────────────────────────

/**
 * Returns the 5 most recently created courses with their completion stats.
 *
 * Aggregation pipeline per course:
 *   1. Match courses for this user, sorted newest first, limit 5
 *   2. Look up all videos for each course
 *   3. Look up Progress records for this user scoped to those video IDs
 *   4. Count completed videos from those progress records
 *   5. Project the final shape
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<object[]>}
 */
const _getRecentCourses = async (userObjId) => {
  return Course.aggregate([
    // Stage 1 — only this user's courses, newest first
    { $match: { userId: userObjId } },
    { $sort:  { createdAt: -1 } },
    { $limit: 5 },

    // Stage 2 — pull in videos for each course
    {
      $lookup: {
        from:         "videos",
        localField:   "_id",
        foreignField: "courseId",
        as:           "videos",
      },
    },

    // Stage 3 — pull in completed progress records for this user
    // that belong to the videos in this course
    {
      $lookup: {
        from: "progresses",  // Mongoose pluralises "Progress" → "progresses"
        let:  { videoIds: "$videos._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in:  ["$videoId",  "$$videoIds"] },
                  { $eq:  ["$userId",   userObjId]    },
                  { $eq:  ["$completed", true]         },
                ],
              },
            },
          },
        ],
        as: "completedProgress",
      },
    },

    // Stage 4 — shape the final output
    {
      $project: {
        _id:             0,
        courseId:        "$_id",
        title:           1,
        source:          1,
        tags:            1,
        totalVideos:     { $size: "$videos" },
        completedVideos: { $size: "$completedProgress" },
        createdAt:       1,
      },
    },
  ]);
};

module.exports = { getDashboard };