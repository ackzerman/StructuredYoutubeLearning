const Course = require("../models/Course");
const Video = require("../models/Video");
const AppError = require("../utils/AppError");
const {
  extractPlaylistId,
  fetchPlaylistTitle,
  fetchPlaylistItems,
  fetchVideoDurations,
} = require("../utils/youtubeHelpers");

// ─── Create Manual Course ─────────────────────────────────────────────────────

/**
 * @route   POST /api/courses/manual
 * @desc    Create a new course manually with a list of videos
 * @access  Protected
 *
 * Body: {
 *   title    : string         (required)
 *   tags     : string[]       (optional)
 *   videos   : [{ title: string, duration: number }]  (required, min 1)
 * }
 */
const createManualCourse = async (req, res, next) => {
  try {
    const { title, tags = [], videos } = req.body;
    const userId = req.userId;

    // ── 1. Input validation ───────────────────────────────────────────────────

    if (!title || typeof title !== "string" || title.trim() === "") {
      return next(new AppError("Course title is required.", 400));
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      return next(new AppError("At least one video is required.", 400));
    }

    // Validate each video entry before touching the DB
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      if (!v.title || typeof v.title !== "string" || v.title.trim() === "") {
        return next(new AppError(`Video at index ${i} is missing a title.`, 400));
      }
      if (typeof v.duration !== "number" || v.duration <= 0) {
        return next(new AppError(`Video at index ${i} must have a positive duration (in seconds).`, 400));
      }
    }

    // ── 2. Derive aggregate fields ────────────────────────────────────────────

    const totalVideos   = videos.length;
    const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);

    // ── 3. Create and persist the Course document ─────────────────────────────

    const course = await Course.create({
      userId,
      title:         title.trim(),
      source:        "manual",
      tags,
      totalVideos,
      totalDuration,
    });

    // ── 4. Create all Video documents in one bulk insert ──────────────────────

    const videoDocs = videos.map((v, index) => ({
      courseId:   course._id,
      title:      v.title.trim(),
      duration:   v.duration,
      orderIndex: index,          // 0-based position in the playlist
      videoUrl:   v.videoUrl || "", // optional for manual courses
    }));

    const createdVideos = await Video.insertMany(videoDocs);

    // ── 5. Respond ────────────────────────────────────────────────────────────

    res.status(201).json({
      course,
      videos: createdVideos,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Courses ──────────────────────────────────────────────────────────

/**
 * @route   GET /api/courses
 * @desc    Fetch all courses belonging to the authenticated user
 * @access  Protected
 */
const getCourses = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Sort newest first so the dashboard shows recent courses at the top
    const courses = await Course.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ courses });
  } catch (err) {
    next(err);
  }
};

// ─── Get Course By ID ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/courses/:id
 * @desc    Fetch a single course with all its videos
 * @access  Protected — only the course owner can access it
 */
const getCourseById = async (req, res, next) => {
  try {
    const userId   = req.userId;
    const courseId = req.params.id;

    // ── 1. Find the course ────────────────────────────────────────────────────

    const course = await Course.findById(courseId);

    if (!course) {
      return next(new AppError("Course not found.", 404));
    }

    // ── 2. Ownership check — prevent users accessing each other's courses ─────

    // Compare as strings because one is an ObjectId and one is a JWT string
    if (course.userId.toString() !== userId.toString()) {
      return next(new AppError("You are not authorised to access this course.", 403));
    }

    // ── 3. Fetch videos ordered by their position in the playlist ─────────────

    const videos = await Video.find({ courseId }).sort({ orderIndex: 1 });

    // ── 4. Respond ────────────────────────────────────────────────────────────

    res.status(200).json({ course, videos });
  } catch (err) {
    next(err);
  }
};


// ─── Import YouTube Playlist ──────────────────────────────────────────────────

/**
 * @route   POST /api/courses/youtube
 * @desc    Create a course by importing a YouTube playlist
 * @access  Protected
 *
 * Body: {
 *   playlistUrl : string    (required) — full YouTube playlist URL
 *   tags        : string[]  (optional)
 * }
 */
const importYoutubeCourse = async (req, res, next) => {
  try {
    const { playlistUrl, tags = [] } = req.body;
    const userId = req.userId;

    // ── 1. Validate input ─────────────────────────────────────────────────────

    if (!playlistUrl || typeof playlistUrl !== "string") {
      return next(new AppError("playlistUrl is required.", 400));
    }

    // ── 2. Extract playlist ID from URL ───────────────────────────────────────

    const playlistId = extractPlaylistId(playlistUrl);

    // ── 3. Fetch playlist title + all video entries (paginated) ───────────────

    const [playlistTitle, { items }] = await Promise.all([
      fetchPlaylistTitle(playlistId),
      fetchPlaylistItems(playlistId),
    ]);

    if (items.length === 0) {
      return next(new AppError("This playlist is empty or all videos are private/deleted.", 400));
    }

    // ── 4. Fetch durations for every video in one or more batched API calls ───

    const videoIds    = items.map((v) => v.videoId);
    const durationMap = await fetchVideoDurations(videoIds);

    // ── 5. Compute aggregate totals ───────────────────────────────────────────

    const totalVideos   = items.length;
    const totalDuration = items.reduce(
      (sum, v) => sum + (durationMap[v.videoId] || 0),
      0
    );

    // ── 6. Create Course document ─────────────────────────────────────────────

    const course = await Course.create({
      userId,
      title:        playlistTitle,
      source:       "youtube",
      playlistUrl,
      tags,
      totalVideos,
      totalDuration,
    });

    // ── 7. Build and bulk-insert Video documents ──────────────────────────────

    const videoDocs = items.map((v, index) => ({
      courseId:   course._id,
      title:      v.title,
      videoUrl:   `https://www.youtube.com/watch?v=${v.videoId}`,
      duration:   durationMap[v.videoId] || 0,
      orderIndex: index,
    }));

    const createdVideos = await Video.insertMany(videoDocs);

    // ── 8. Respond ────────────────────────────────────────────────────────────

    res.status(201).json({ course, videos: createdVideos });
  } catch (err) {
    next(err);
  }
};

module.exports = { createManualCourse, getCourses, getCourseById, importYoutubeCourse };