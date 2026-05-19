import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import { useAuth } from '../hooks/useAuth';
import { ErrBox, LabelInput } from '../components/UI';

export default function Register() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);

  const F = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await authAPI.register(form);
      login(d.token, d.user);
      navigate('/');
    } catch (err) {
      setErr(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0b0d15',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(240,160,48,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#f0a030', letterSpacing: '-0.04em', lineHeight: 1 }}>learnr.</div>
          <p style={{ color: '#828aaa', fontSize: 15, marginTop: 10 }}>Start tracking your learning today</p>
        </div>

        <div className="card fade-up" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 24, color: '#dee2f0' }}>
            Create account
          </h2>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <LabelInput label="Name" type="text" placeholder="Your full name" value={form.name} onChange={F('name')} required autoComplete="name" />
            <LabelInput label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={F('email')} required autoComplete="email" />
            <LabelInput
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={F('password')}
              required
              minLength={6}
              autoComplete="new-password"
              hint="At least 6 characters"
            />
            <ErrBox msg={err} />
            <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%', padding: 12, fontSize: 15 }}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#828aaa', fontSize: 14 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#f0a030', fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
