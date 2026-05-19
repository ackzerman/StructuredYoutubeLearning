import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard' },
  { to: '/courses',   label: 'My Courses' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/profile',   label: 'Profile' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={{
      background: '#13161f',
      borderBottom: '1px solid #252a3d',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#f0a030', letterSpacing: '-0.03em' }}>
            learnr.
          </span>
        </NavLink>
        <div style={{ display: 'flex', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <button className={`nav-tab${isActive ? ' active' : ''}`}>{item.label}</button>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,#f0a030,#e06010)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff',
            }}>
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: '#9ba3c4', fontWeight: 500 }}>
              {user.name.split(' ')[0]}
            </span>
            {user.streak > 0 && (
              <span style={{ fontSize: 12, color: '#f97316', fontWeight: 700 }}>
                {user.streak}🔥
              </span>
            )}
          </div>
        )}
        <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
