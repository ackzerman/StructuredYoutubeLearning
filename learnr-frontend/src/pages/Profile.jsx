import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { fmtDate } from '../utils';
import { Spinner } from '../components/UI';
import { useAuth } from '../hooks/useAuth';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #252a3d' }}>
      <span style={{ color: '#828aaa', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#dee2f0', fontSize: 13, fontWeight: 500, fontFamily: label === 'User ID' ? 'DM Mono, monospace' : 'inherit', fontSize: label === 'User ID' ? 12 : 13 }}>
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
  if (!user)   return <p style={{ color: '#828aaa', textAlign: 'center', padding: 60 }}>Could not load profile.</p>;

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
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #f0a030, #e06010)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff',
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#dee2f0', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{user.name}</h2>
            <p style={{ color: '#828aaa', fontSize: 14, margin: 0 }}>{user.email}</p>
          </div>
        </div>

        {/* Streak + member since */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#0e1020', borderRadius: 10, padding: 16 }}>
            <p style={{ color: '#828aaa', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Current streak
            </p>
            <p style={{ color: '#f97316', fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{user.streak} 🔥</p>
            <p style={{ color: '#454e6a', fontSize: 12, margin: '6px 0 0' }}>
              {user.streak === 0 ? 'Watch a video to start!' : user.streak === 1 ? '1 day in a row' : `${user.streak} days in a row`}
            </p>
          </div>
          <div style={{ background: '#0e1020', borderRadius: 10, padding: 16 }}>
            <p style={{ color: '#828aaa', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Member since
            </p>
            <p style={{ color: '#dee2f0', fontSize: 18, fontWeight: 700, margin: 0 }}>{fmtDate(user.createdAt)}</p>
            <p style={{ color: '#454e6a', fontSize: 12, margin: '6px 0 0' }}>Keep the momentum going!</p>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dee2f0', marginBottom: 4 }}>Account</h3>
        <div>
          <InfoRow label="Name"         value={user.name} />
          <InfoRow label="Email"        value={user.email} />
          <InfoRow label="User ID"      value={user._id} />
          <InfoRow label="Last active"  value={user.lastActiveDate ? fmtDate(user.lastActiveDate) : '—'} />
          <div style={{ padding: '12px 0' }}>
            <span style={{ color: '#828aaa', fontSize: 13 }}>Account created</span>
            <span style={{ float: 'right', color: '#dee2f0', fontSize: 13, fontWeight: 500 }}>{fmtDate(user.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button className="btn-danger" style={{ width: '100%', padding: 12, fontSize: 14 }} onClick={handleLogout}>
        Sign out of learnr.
      </button>
    </div>
  );
}
