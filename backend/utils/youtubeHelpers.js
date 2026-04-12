const axios = require("axios");
const AppError = require("./AppError");

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

// ─── Extract Playlist ID from URL ─────────────────────────────────────────────

/**
 * Pulls the "list" query parameter out of any YouTube playlist URL.
 *
 * Supports formats:
 *   https://www.youtube.com/playlist?list=PLxxxxxx
 *   https://www.youtube.com/watch?v=xxx&list=PLxxxxxx
 *
 * @param   {string} url
 * @returns {string} playlistId
 * @throws  {AppError} if no valid list param is found
 */
const extractPlaylistId = (url) => {
  try {
    const { searchParams } = new URL(url);
    const listId = searchParams.get("list");
    if (!listId) throw new Error();
    return listId;
  } catch {
    throw new AppError(
      "Invalid YouTube playlist URL. Expected format: https://www.youtube.com/playlist?list=XXXX",
      400
    );
  }
};

// ─── Parse ISO 8601 Duration → Seconds ───────────────────────────────────────

/**
 * Converts a YouTube ISO 8601 duration string into total seconds.
 *
 * Examples:
 *   "PT5M30S"  →  330
 *   "PT1H2M3S" →  3723
 *   "PT45S"    →  45
 *   "PT10M"    →  600
 *
 * @param   {string} iso  e.g. "PT1H2M30S"
 * @returns {number}      total seconds (0 if unparseable)
 */
const parseDuration = (iso) => {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours   = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
};

// ─── Fetch All Playlist Items (handles pagination) ────────────────────────────

/**
 * Retrieves every video entry in a YouTube playlist.
 * Handles playlists with more than 50 videos via nextPageToken pagination.
 *
 * @param   {string} playlistId
 * @returns {Promise<{ videoId: string, title: string, playlistTitle: string }[]>}
 */
const fetchPlaylistItems = async (playlistId) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const items  = [];
  let pageToken = null;
  let playlistTitle = "";

  do {
    const params = {
      part:       "snippet",
      maxResults: 50,
      playlistId,
      key:        apiKey,
      ...(pageToken && { pageToken }),
    };

    let response;
    try {
      response = await axios.get(`${YT_API_BASE}/playlistItems`, { params });
    } catch (err) {
      // Unwrap the YouTube API error message if available
      const message =
        err.response?.data?.error?.message || "Failed to fetch playlist from YouTube.";
      throw new AppError(message, 502);
    }

    const data = response.data;

    // Capture the playlist title from the first page
    if (!playlistTitle && data.items?.[0]) {
      playlistTitle =
        data.items[0].snippet?.channelTitle || "Untitled Playlist";
    }

    // Only include videos that are actually available (not deleted/private)
    for (const item of data.items || []) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId;
      const title   = snippet?.title;

      if (videoId && title && title !== "Deleted video" && title !== "Private video") {
        // Capture playlist title from the playlistId's own snippet if available
        if (!playlistTitle && snippet.playlistTitle) {
          playlistTitle = snippet.playlistTitle;
        }
        items.push({ videoId, title });
      }
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return { items, playlistTitle };
};

// ─── Fetch Playlist Metadata (title) ─────────────────────────────────────────

/**
 * Fetches the official title of a YouTube playlist.
 *
 * @param   {string} playlistId
 * @returns {Promise<string>} playlist title
 */
const fetchPlaylistTitle = async (playlistId) => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    const response = await axios.get(`${YT_API_BASE}/playlists`, {
      params: {
        part: "snippet",
        id:   playlistId,
        key:  apiKey,
      },
    });

    return response.data.items?.[0]?.snippet?.title || "Untitled Playlist";
  } catch {
    // Non-critical — fall back gracefully rather than failing the whole import
    return "Untitled Playlist";
  }
};

// ─── Fetch Video Durations ────────────────────────────────────────────────────

/**
 * Given an array of YouTube video IDs, returns a map of { videoId → seconds }.
 * Batches IDs in groups of 50 to stay within API limits.
 *
 * @param   {string[]} videoIds
 * @returns {Promise<Record<string, number>>}  e.g. { "dQw4w9WgXcQ": 213 }
 */
const fetchVideoDurations = async (videoIds) => {
  const apiKey      = process.env.YOUTUBE_API_KEY;
  const durationMap = {};

  // YouTube allows up to 50 IDs per request
  const BATCH_SIZE = 50;

  for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
    const batch = videoIds.slice(i, i + BATCH_SIZE);

    let response;
    try {
      response = await axios.get(`${YT_API_BASE}/videos`, {
        params: {
          part: "contentDetails",
          id:   batch.join(","),
          key:  apiKey,
        },
      });
    } catch (err) {
      const message =
        err.response?.data?.error?.message || "Failed to fetch video details from YouTube.";
      throw new AppError(message, 502);
    }

    for (const item of response.data.items || []) {
      durationMap[item.id] = parseDuration(item.contentDetails?.duration);
    }
  }

  return durationMap;
};

module.exports = {
  extractPlaylistId,
  parseDuration,
  fetchPlaylistItems,
  fetchPlaylistTitle,
  fetchVideoDurations,
};
