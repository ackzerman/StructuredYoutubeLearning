import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { fmtDate } from '../utils';
import { Spinner } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '2px solid #181f21' }}>
      <span className="label-caps" style={{ color: '#747879' }}>{label}</span>
      <span style={{
        color: '#181f21', fontWeight: 600,
        fontFamily: label === 'User ID' ? "'Space Mono', monospace" : "'Public Sans', sans-serif",
        fontSize: label === 'User ID' ? 12 : 14,
      }}>
        {value}
      </span>
    </div>
  );
}

export default function Profile() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.me().then((d) => setUser(d.user)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return <Spinner pad={80} />;
  if (!user)   return <p style={{ color: '#747879', textAlign: 'center', padding: 60 }}>Could not load profile.</p>;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page-wrapper-sm fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your account details</p>
      </div>

      {/* Avatar + name */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 0, flexShrink: 0,
            border: '4px solid #181f21',
            background: '#d0e3c1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#181f21',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22, fontWeight: 700, color: '#181f21', margin: '0 0 4px', letterSpacing: '-0.01em',
            }}>{user.name}</h2>
            <p style={{ color: '#747879', fontSize: 14, margin: 0, fontFamily: "'Public Sans', sans-serif" }}>{user.email}</p>
          </div>
        </div>

        {/* Streak + member since */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#d0e3c1', border: '2px solid #181f21', padding: 20 }}>
            <p className="label-caps" style={{ color: '#3c4b32', margin: '0 0 8px' }}>Current streak</p>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#181f21', fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: '-0.02em',
            }}>{user.streak} 🔥</p>
            <p style={{ color: '#536348', fontSize: 12, margin: '6px 0 0', fontFamily: "'Public Sans', sans-serif" }}>
              {user.streak === 0 ? 'Watch a video to start!' : user.streak === 1 ? '1 day in a row' : `${user.streak} days in a row`}
            </p>
          </div>
          <div style={{ background: '#f5f4e8', border: '2px solid #181f21', padding: 20 }}>
            <p className="label-caps" style={{ color: '#747879', margin: '0 0 8px' }}>Member since</p>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#181f21', fontSize: 20, fontWeight: 700, margin: 0,
            }}>{fmtDate(user.createdAt)}</p>
            <p style={{ color: '#c3c7c8', fontSize: 12, margin: '6px 0 0', fontFamily: "'Public Sans', sans-serif" }}>Keep the momentum going!</p>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16, fontWeight: 700, color: '#181f21', marginBottom: 4,
        }}>Account</h3>
        <div>
          <InfoRow label="Name"         value={user.name} />
          <InfoRow label="Email"        value={user.email} />
          <InfoRow label="User ID"      value={user._id} />
          <InfoRow label="Last active"  value={user.lastActiveDate ? fmtDate(user.lastActiveDate) : '—'} />
          <div style={{ padding: '14px 0' }}>
            <span className="label-caps" style={{ color: '#747879' }}>Account created</span>
            <span style={{
              float: 'right', color: '#181f21', fontSize: 14, fontWeight: 600,
              fontFamily: "'Public Sans', sans-serif",
            }}>{fmtDate(user.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button className="btn-danger" style={{ width: '100%', padding: 14, fontSize: 14 }} onClick={handleLogout}>
        Sign out of Learnr
      </button>
    </div>
  );
}
