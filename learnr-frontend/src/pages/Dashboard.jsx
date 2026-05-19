import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { fmt, pct, ytThumb } from '../utils';
import { Spinner, StatCard, Heatmap, HeatmapLegend, ProgressBar, EmptyState, SectionHeader } from '../components/UI';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner pad={100} />;
  if (!data)   return <p style={{ color: '#828aaa', padding: 60, textAlign: 'center' }}>Failed to load dashboard.</p>;

  const { stats, heatmap, continueWatching, recentCourses } = data;
  const remaining = stats.totalVideos - stats.videosWatched;

  return (
    <div className="page-wrapper fade-up">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-sub">Track your learning journey</p>
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Videos watched"   value={`${stats.videosWatched} / ${stats.totalVideos}`} color="#f0a030" sub="total progress" />
        <StatCard label="Completion"        value={`${stats.completionPercentage}%`}                 color="#13c5b4" sub="across all courses" />
        <StatCard label="Current streak"   value={`${stats.currentStreak} 🔥`}                      color="#f97316" sub="consecutive days" />
        <StatCard label="Best streak"      value={`${stats.maxStreak} 🏆`}                          color="#f0a030" sub="personal best" />
        <StatCard label="Videos remaining"  value={remaining}                                        color="#828aaa" sub="keep going!" />
      </div>

      {/* Activity heatmap */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 className="section-header">Activity — last 13 weeks</h3>
          <HeatmapLegend />
        </div>
        <Heatmap data={heatmap} weeks={13} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: continueWatching ? '1fr 1fr' : '1fr', gap: 24 }}>

        {/* Continue watching */}
        {continueWatching && (
          <div className="card">
            <SectionHeader title="Continue watching" />
            <div style={{ background: '#0e1020', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                {(() => {
                  const cwThumb = ytThumb(continueWatching.thumbnailUrl, continueWatching.videoUrl);
                  return cwThumb ? (
                    <img src={cwThumb} alt="" className="thumb-video" loading="lazy" />
                  ) : null;
                })()}
                <div>
                  <p style={{ color: '#828aaa', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    {continueWatching.courseTitle}
                  </p>
                  <p style={{ color: '#dee2f0', fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                    {continueWatching.videoTitle}
                  </p>
                </div>
              </div>
              <ProgressBar value={pct(continueWatching.watchedSeconds, continueWatching.duration)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0 14px' }}>
                <span style={{ fontSize: 12, color: '#828aaa' }}>{fmt(continueWatching.watchedSeconds)} watched</span>
                <span style={{ fontSize: 12, color: '#828aaa' }}>
                  {fmt(continueWatching.duration)} total · {pct(continueWatching.watchedSeconds, continueWatching.duration)}%
                </span>
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => navigate(`/courses/${continueWatching.courseId}/watch/${continueWatching.videoId}`)}
              >
                Resume →
              </button>
            </div>
          </div>
        )}

        {/* Recent courses */}
        <div className="card">
          <SectionHeader
            title="Recent courses"
            action="View all →"
            onAction={() => navigate('/courses')}
          />
          {recentCourses.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No courses yet"
              sub="Import a YouTube playlist or create one manually."
              action="Add first course"
              onAction={() => navigate('/courses')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentCourses.map((c) => {
                const cp = c.totalVideos > 0 ? Math.round((c.completedVideos / c.totalVideos) * 100) : 0;
                return (
                  <div
                    key={c.courseId}
                    className="card-hover"
                    style={{ padding: '12px 14px', background: '#0e1020', borderRadius: 9, cursor: 'pointer', border: '1px solid transparent' }}
                    onClick={() => navigate(`/courses/${c.courseId}`)}
                  >
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                      {(() => {
                        const rcThumb = ytThumb(c.thumbnailUrl, c.firstVideoUrl);
                        return rcThumb ? (
                          <img src={rcThumb} alt="" className="thumb-video" loading="lazy" />
                        ) : null;
                      })()}
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ color: '#dee2f0', fontSize: 14, fontWeight: 600, margin: 0 }}>{c.title}</p>
                          <p style={{ color: '#828aaa', fontSize: 12, margin: '2px 0 0' }}>
                            {c.completedVideos} / {c.totalVideos} videos
                          </p>
                        </div>
                        <span style={{ color: cp === 100 ? '#4ade80' : '#f0a030', fontWeight: 800, fontSize: 15 }}>{cp}%</span>
                      </div>
                    </div>
                    <ProgressBar value={cp} color={cp === 100 ? '#4ade80' : '#f0a030'} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
