import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { coursesAPI, progressAPI } from '../api';
import { fmt, pct, fmtDate, parseTags, ytThumb } from '../utils';
import {
  Spinner, ErrBox, ProgressBar, Modal, LabelInput,
  CourseBadge, VideoCircle, EmptyState, TagEditor,
} from '../components/UI';
import { useToast } from '../hooks/useToast';

/* ─── Add video form ─────────────────────────────────────────────────────── */
function AddVideoForm({ courseId, onDone }) {
  const [form, setForm] = useState({ title: '', duration: '', videoUrl: '' });
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const F = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await coursesAPI.addVideo(courseId, { title: form.title, duration: parseInt(form.duration), videoUrl: form.videoUrl });
      toast('Video added ✓');
      onDone();
    } catch (err) { setErr(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <LabelInput label="Title"            placeholder="Video title"          value={form.title}    onChange={F('title')}    required />
      <LabelInput label="Duration (seconds)" type="number" min="1" placeholder="e.g. 600 for 10 min" value={form.duration} onChange={F('duration')} required hint="Convert minutes × 60" />
      <LabelInput label="Video URL (optional)" type="url" placeholder="https://..."                   value={form.videoUrl} onChange={F('videoUrl')} />
      <ErrBox msg={err} />
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add Video'}</button>
    </form>
  );
}

/* ─── Course detail ──────────────────────────────────────────────────────── */
export default function CourseDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const toast    = useToast();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags]   = useState('');
  const [showAddVideo, setShowAddVideo] = useState(false);

  // Track starred state locally so toggling is instant without a full reload
  const [starredMap, setStarredMap] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await coursesAPI.getDetails(id);
      setData(d);
      setEditTitle(d.course.title);
      setEditTags(d.course.tags?.join(', ') || '');
      // Seed the local starred map from the API response
      const map = {};
      d.videos.forEach((v) => { map[v.videoId] = v.progress?.starred ?? false; });
      setStarredMap(map);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [id]);

  const toggleStar = async (videoId) => {
    // Optimistic update — flip immediately so UI feels instant
    setStarredMap((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
    try {
      const res = await progressAPI.toggleStar(videoId);
      // Sync with server's authoritative value
      setStarredMap((prev) => ({ ...prev, [videoId]: res.starred }));
    } catch (e) {
      // Revert on failure
      setStarredMap((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
      toast(e.message, 'error');
    }
  };

  useEffect(() => { load(); }, []);

  const saveEdit = async () => {
    try {
      await coursesAPI.update(id, { title: editTitle, tags: parseTags(editTags) });
      toast('Course updated ✓');
      setEditMode(false);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteCourse = async () => {
    if (!confirm('Delete this course and ALL its data? This cannot be undone.')) return;
    try {
      await coursesAPI.delete(id);
      toast('Course deleted');
      navigate('/courses');
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteVideo = async (videoId, videoTitle) => {
    if (!confirm(`Remove "${videoTitle}"?`)) return;
    try {
      await coursesAPI.removeVideo(id, videoId);
      toast('Video removed');
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <Spinner pad={80} />;
  if (!data)   return <p style={{ color: '#828aaa', textAlign: 'center', padding: 60 }}>Course not found.</p>;

  const { course, stats, videos } = data;
  const isYT = course.source === 'youtube';

  return (
    <div className="page-wrapper fade-up" style={{ maxWidth: 900 }}>
      <button className="btn-ghost" style={{ marginBottom: 20, fontSize: 13 }} onClick={() => navigate('/courses')}>
        ← Back to courses
      </button>

      {/* Course header card */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        {/* Course thumbnail banner */}
        {course.thumbnailUrl && (
          <img src={course.thumbnailUrl} alt="" style={{
            width: '100%', height: 180, objectFit: 'cover', display: 'block',
          }} />
        )}
        <div style={{ padding: 20 }}>
        {editMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <LabelInput label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <LabelInput label="Tags (comma-separated)" value={editTags} onChange={(e) => setEditTags(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={saveEdit}>Save changes</button>
              <button className="btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Top row: badge + actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <CourseBadge source={course.source} />
                  {course.playlistUrl && (
                    <a href={course.playlistUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#f0a030', fontSize: 12, textDecoration: 'none' }}>
                      View playlist ↗
                    </a>
                  )}
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#dee2f0', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                  {course.title}
                </h1>
                <div style={{ marginTop: 4 }}>
                  <TagEditor
                    tags={course.tags || []}
                    onUpdate={async (newTags) => {
                      try {
                        await coursesAPI.update(id, { tags: newTags });
                        setData((prev) => ({
                          ...prev,
                          course: { ...prev.course, tags: newTags },
                        }));
                        toast('Tags updated ✓');
                      } catch (e) { toast(e.message, 'error'); }
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => setEditMode(true)}>Edit</button>
                <button className="btn-danger" onClick={deleteCourse}>Delete</button>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 28, marginTop: 20, paddingTop: 18, borderTop: '1px solid #252a3d', flexWrap: 'wrap' }}>
              {[
                { l: 'Videos',      v: `${stats.completedVideos} / ${stats.totalVideos}`, c: '#dee2f0' },
                { l: 'Completion',  v: `${stats.completionPercentage}%`,                  c: '#f0a030' },
                { l: 'Watch time',  v: fmt(stats.totalWatchTime),                         c: '#13c5b4' },
                { l: 'Total length', v: fmt(course.totalDuration),                        c: '#828aaa' },
                { l: 'Created',     v: fmtDate(course.createdAt),                         c: '#454e6a' },
              ].map((s) => (
                <div key={s.l}>
                  <p style={{ color: '#828aaa', fontSize: 11, margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</p>
                  <p style={{ color: s.c, fontSize: 18, fontWeight: 800, margin: 0 }}>{s.v}</p>
                </div>
              ))}
            </div>

            {/* Overall progress */}
            <div style={{ marginTop: 14 }}>
              <ProgressBar value={stats.completionPercentage} color={stats.completionPercentage === 100 ? '#4ade80' : '#f0a030'} height={6} />
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Video list header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 className="section-header">Videos ({videos.length})</h2>
        {!isYT && (
          <button className="btn-ghost" onClick={() => setShowAddVideo(true)}>+ Add video</button>
        )}
      </div>

      {videos.length === 0 ? (
        <EmptyState icon="🎬" title="No videos" sub={isYT ? 'No videos found in this playlist.' : 'Add your first video to get started.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {videos.map((v, i) => {
            const wp = pct(v.progress.watchedSeconds, v.duration);
            return (
              <div key={v.videoId} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Video thumbnail */}
                {(() => {
                  const vThumb = ytThumb(v.thumbnailUrl, v.videoUrl);
                  return vThumb ? (
                    <img src={vThumb} alt="" className="thumb-video" loading="lazy" />
                  ) : (
                    <VideoCircle index={i} completed={v.progress.completed} active={false} />
                  );
                })()}

                {/* Info — click to watch */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/courses/${id}/watch/${v.videoId}`)}>
                  <p style={{ color: '#dee2f0', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.title}
                  </p>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 5 }}>
                    <span style={{ color: '#828aaa', fontSize: 12 }}>{fmt(v.duration)}</span>
                    {v.progress.watchedSeconds > 0 && !v.progress.completed && (
                      <>
                        <div style={{ flex: 1, maxWidth: 120 }}><ProgressBar value={wp} height={3} /></div>
                        <span style={{ color: '#828aaa', fontSize: 12 }}>{wp}%</span>
                      </>
                    )}
                    {v.progress.completed && <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 600 }}>✓ Complete</span>}
                    {v.note?.content && <span style={{ color: '#454e6a', fontSize: 12 }}>📝</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {/* Star button */}
                  <button
                    onClick={() => toggleStar(v.videoId)}
                    title={starredMap[v.videoId] ? 'Unstar video' : 'Star as important'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 18,
                      lineHeight: 1,
                      padding: '4px 2px',
                      color: starredMap[v.videoId] ? '#f0a030' : '#2d3348',
                      transition: 'color 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!starredMap[v.videoId]) e.currentTarget.style.color = '#6b4010'; }}
                    onMouseLeave={(e) => { if (!starredMap[v.videoId]) e.currentTarget.style.color = '#2d3348'; }}
                  >
                    {starredMap[v.videoId] ? '★' : '☆'}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => navigate(`/courses/${id}/watch/${v.videoId}`)}
                  >
                    {v.progress.completed ? 'Rewatch' : v.progress.watchedSeconds > 0 ? 'Resume' : 'Watch'}
                  </button>
                  {!isYT && (
                    <button className="btn-danger" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => deleteVideo(v.videoId, v.title)}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddVideo && (
        <Modal title="Add Video" onClose={() => setShowAddVideo(false)}>
          <AddVideoForm courseId={id} onDone={() => { setShowAddVideo(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}