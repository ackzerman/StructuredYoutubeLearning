const Course = require("../models/Course");
const Video = require("../models/Video");
const Progress  = require("../models/Progress");
const Note      = require("../models/Note");
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


// ─── Get Course Detail ────────────────────────────────────────────────────────
 
/**
 * @route   GET /api/courses/:id/details
 * @desc    Returns full course detail — videos merged with per-video progress
 *          and notes — plus computed completion stats.
 *          Uses Maps for O(1) lookup instead of nested loops (no N+1 queries).
 * @access  Protected
 */
const getCourseDetails = async (req, res, next) => {
  try {
    const userId   = req.userId;
    const courseId = req.params.id;
 
    // ── 1. Fetch course and verify ownership ──────────────────────────────────
 
    const course = await Course.findById(courseId);
 
    if (!course) {
      return next(new AppError("Course not found.", 404));
    }
 
    if (course.userId.toString() !== userId.toString()) {
      return next(new AppError("You are not authorised to access this course.", 403));
    }
 
    // ── 2. Fetch videos, progress, and notes in parallel ──────────────────────
    // All three queries fire at the same time — no sequential waiting.
 
    const videos = await Video.find({ courseId }).sort({ orderIndex: 1 });
 
    const videoIds = videos.map((v) => v._id);
 
    const [progressList, noteList] = await Promise.all([
      Progress.find({ userId, videoId: { $in: videoIds } }),
      Note.find({ userId, videoId: { $in: videoIds } }),
    ]);
 
    // ── 3. Build O(1) lookup Maps keyed by videoId string ─────────────────────
    // Avoids scanning the full array for each video (no N+1 problem).
 
    const progressMap = new Map(
      progressList.map((p) => [p.videoId.toString(), p])
    );
 
    const noteMap = new Map(
      noteList.map((n) => [n.videoId.toString(), n])
    );
 
    // ── 4. Merge video + progress + note into a single object per video ────────
 
    const mergedVideos = videos.map((video) => {
      const videoIdStr = video._id.toString();
      const progress   = progressMap.get(videoIdStr);
      const note       = noteMap.get(videoIdStr);
 
      return {
        videoId:    video._id,
        title:      video.title,
        videoUrl:   video.videoUrl,
        duration:   video.duration,
        orderIndex: video.orderIndex,
        progress: {
          watchedSeconds: progress?.watchedSeconds ?? 0,
          completed:      progress?.completed      ?? false,
          lastWatchedAt:  progress?.lastWatchedAt  ?? null,
        },
        note: {
          content:   note?.content   ?? "",
          updatedAt: note?.updatedAt ?? null,
        },
      };
    });
 
    // ── 5. Compute course-level stats from the merged data ─────────────────────
 
    const totalVideos    = mergedVideos.length;
    const completedVideos = mergedVideos.filter((v) => v.progress.completed).length;
    const totalWatchTime  = mergedVideos.reduce(
      (sum, v) => sum + v.progress.watchedSeconds, 0
    );
    const completionPercentage =
      totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
 
    // ── 6. Respond ────────────────────────────────────────────────────────────
 
    res.status(200).json({
      course: {
        id:            course._id,
        title:         course.title,
        source:        course.source,
        tags:          course.tags,
        playlistUrl:   course.playlistUrl,
        totalVideos:   course.totalVideos,
        totalDuration: course.totalDuration,
        createdAt:     course.createdAt,
      },
      stats: {
        totalVideos,
        completedVideos,
        completionPercentage,
        totalWatchTime,
      },
      videos: mergedVideos,
    });
  } catch (err) {
    next(err);
  }
};
 
module.exports = { createManualCourse, getCourses, getCourseById, importYoutubeCourse, getCourseDetails };
 