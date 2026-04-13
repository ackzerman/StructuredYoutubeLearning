const mongoose      = require("mongoose");
const DailyActivity = require("../models/DailyActivity");
const AppError      = require("../utils/AppError");

// ─── Heatmap ──────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/analytics/heatmap?range=30d|90d|year|all
 * @desc    Return per-day activity counts for the requested date range.
 *          Gaps (days with no activity) are filled with count: 0 so the
 *          frontend heatmap always receives a complete, contiguous window.
 * @access  Protected
 */
const getHeatmap = async (req, res, next) => {
  try {
    const userObjId = new mongoose.Types.ObjectId(req.userId);
    const { range = "30d" } = req.query;

    // ── 1. Resolve the start date for the requested range ─────────────────────

    const today     = new Date();
    const startDate = _resolveStartDate(range, today);

    if (startDate === undefined) {
      return next(new AppError('Invalid range. Use: 30d | 90d | year | all', 400));
    }

    // ── 2. Fetch only the records that fall inside the window ─────────────────

    const matchStage = { userId: userObjId };

    // "all" has no lower bound — fetch the user's entire history
    if (range !== "all") {
      matchStage.date = { $gte: startDate.toISOString().slice(0, 10) };
    }

    const records = await DailyActivity.find(matchStage)
      .select("date videosWatchedCount totalWatchSeconds")
      .sort({ date: 1 });

    // ── 3. Build a complete day-by-day window and merge with DB records ────────

    const heatmap = _fillDateGaps(records, startDate, today);

    res.status(200).json({ range, heatmap });
  } catch (err) {
    next(err);
  }
};

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/analytics/summary
 * @desc    Return aggregated activity broken down by day, month, and year.
 *          All three aggregations run in parallel for efficiency.
 * @access  Protected
 *
 * Response shape:
 * {
 *   daily:   [ { date: "YYYY-MM-DD", videosWatched, totalSeconds } ]
 *   monthly: [ { month: "YYYY-MM",   videosWatched, totalSeconds } ]
 *   yearly:  [ { year:  "YYYY",      videosWatched, totalSeconds } ]
 * }
 */
const getSummary = async (req, res, next) => {
  try {
    const userObjId = new mongoose.Types.ObjectId(req.userId);

    // Run all three aggregations concurrently
    const [daily, monthly, yearly] = await Promise.all([
      _getDailyBreakdown(userObjId),
      _getMonthlyBreakdown(userObjId),
      _getYearlyBreakdown(userObjId),
    ]);

    res.status(200).json({ daily, monthly, yearly });
  } catch (err) {
    next(err);
  }
};

// ─── Aggregation: Daily ───────────────────────────────────────────────────────

/**
 * Returns raw daily activity records sorted chronologically.
 * No grouping needed — DailyActivity is already bucketed by day.
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<{ date, videosWatched, totalSeconds }[]>}
 */
const _getDailyBreakdown = async (userObjId) => {
  return DailyActivity.aggregate([
    { $match: { userId: userObjId } },
    { $sort:  { date: 1 } },
    {
      $project: {
        _id:          0,
        date:         1,
        videosWatched: "$videosWatchedCount",
        totalSeconds: "$totalWatchSeconds",
      },
    },
  ]);
};

// ─── Aggregation: Monthly ─────────────────────────────────────────────────────

/**
 * Groups all daily records into YYYY-MM buckets and sums each metric.
 *
 * Pipeline:
 *   1. Match this user's records
 *   2. $substr slices the first 7 characters of "YYYY-MM-DD" → "YYYY-MM"
 *   3. $group accumulates the sums per month bucket
 *   4. $sort chronologically
 *   5. $project clean output shape
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<{ month, videosWatched, totalSeconds }[]>}
 */
const _getMonthlyBreakdown = async (userObjId) => {
  return DailyActivity.aggregate([
    { $match: { userId: userObjId } },

    // Extract "YYYY-MM" from the "YYYY-MM-DD" string
    {
      $group: {
        _id:          { $substr: ["$date", 0, 7] }, // "2024-07"
        videosWatched: { $sum: "$videosWatchedCount" },
        totalSeconds: { $sum: "$totalWatchSeconds" },
      },
    },

    { $sort: { _id: 1 } },

    {
      $project: {
        _id:          0,
        month:        "$_id",
        videosWatched: 1,
        totalSeconds: 1,
      },
    },
  ]);
};

// ─── Aggregation: Yearly ──────────────────────────────────────────────────────

/**
 * Groups all daily records into YYYY buckets and sums each metric.
 *
 * Same approach as monthly but slices only the first 4 characters → "YYYY".
 *
 * @param   {ObjectId} userObjId
 * @returns {Promise<{ year, videosWatched, totalSeconds }[]>}
 */
const _getYearlyBreakdown = async (userObjId) => {
  return DailyActivity.aggregate([
    { $match: { userId: userObjId } },

    // Extract "YYYY" from the "YYYY-MM-DD" string
    {
      $group: {
        _id:          { $substr: ["$date", 0, 4] }, // "2024"
        videosWatched: { $sum: "$videosWatchedCount" },
        totalSeconds: { $sum: "$totalWatchSeconds" },
      },
    },

    { $sort: { _id: 1 } },

    {
      $project: {
        _id:          0,
        year:         "$_id",
        videosWatched: 1,
        totalSeconds: 1,
      },
    },
  ]);
};

// ─── Utility: Resolve Range Start Date ───────────────────────────────────────

/**
 * Maps a range string to a UTC start Date, or null for "all".
 *
 * @param   {string} range  "30d" | "90d" | "year" | "all"
 * @param   {Date}   today
 * @returns {Date|null}
 */
const _resolveStartDate = (range, today) => {
  const d = new Date(today);
  d.setUTCHours(0, 0, 0, 0);

  switch (range) {
    case "30d":
      d.setUTCDate(d.getUTCDate() - 29);   // today + 29 previous days = 30 days total
      return d;
    case "90d":
      d.setUTCDate(d.getUTCDate() - 89);
      return d;
    case "year":
      d.setUTCMonth(0, 1);                  // Jan 1 of the current year
      return d;
    case "all":
      return null;                          // no lower bound — caller handles this
    default:
      return undefined;                     // signals an invalid range value
  }
};

// ─── Utility: Fill Date Gaps ──────────────────────────────────────────────────

/**
 * Merges DB records with a complete day-by-day calendar window.
 * Any date missing from DB records is filled in with zeroed counts.
 *
 * @param   {object[]} records   — DailyActivity documents from DB
 * @param   {Date}     startDate — inclusive start (null = use earliest record)
 * @param   {Date}     today     — inclusive end
 * @returns {{ date: string, count: number, totalSeconds: number }[]}
 */
const _fillDateGaps = (records, startDate, today) => {
  // Build O(1) lookup map from DB records
  const recordMap = {};
  for (const r of records) {
    recordMap[r.date] = {
      count:        r.videosWatchedCount,
      totalSeconds: r.totalWatchSeconds,
    };
  }

  // For "all" range — use the earliest record date as the window start
  const windowStart =
    startDate ??
    (records.length > 0 ? new Date(records[0].date) : today);

  // Walk day-by-day from start → today and fill in every date
  const result  = [];
  const cursor  = new Date(windowStart);
  const endDate = new Date(today);
  endDate.setUTCHours(0, 0, 0, 0);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().slice(0, 10);
    result.push({
      date:         dateStr,
      count:        recordMap[dateStr]?.count        ?? 0,
      totalSeconds: recordMap[dateStr]?.totalSeconds ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
};

module.exports = { getHeatmap, getSummary };