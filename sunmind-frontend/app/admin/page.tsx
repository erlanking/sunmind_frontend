'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PROD_URL = 'https://sunmindthebestbackend-production.up.railway.app';
const LOCAL_URL = 'http://localhost:5001';

const s = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0d0f14',
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  } as React.CSSProperties,
  card: {
    background: '#171a1f',
    border: '1px solid #2a2d35',
    borderRadius: 16,
    padding: 40,
    width: 360,
  } as React.CSSProperties,
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#f6c343' } as React.CSSProperties,
  subtitle: { color: '#858a95', fontSize: 14, marginBottom: 24 } as React.CSSProperties,
  label: {
    fontSize: 11,
    color: '#858a95',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  srvRow: { display: 'flex', gap: 8, marginBottom: 8 } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#0d0f14',
    border: '1px solid #2a2d35',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  btnPrimary: {
    width: '100%',
    padding: 12,
    background: '#f6c343',
    color: '#0d0f14',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  } as React.CSSProperties,
  err: { color: '#f87171', fontSize: 13, marginTop: 8, textAlign: 'center' as const },
};

function srvBtn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    border: `1px solid ${active ? '#f6c343' : '#2a2d35'}`,
    background: 'transparent',
    color: active ? '#f6c343' : '#858a95',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all .15s',
  };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState(PROD_URL);
  const [serverChoice, setServerChoice] = useState<'prod' | 'local' | 'custom'>('prod');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_server') || PROD_URL;
    setServerUrl(saved);
    if (saved === PROD_URL) setServerChoice('prod');
    else if (saved === LOCAL_URL) setServerChoice('local');
    else setServerChoice('custom');

    if (localStorage.getItem('admin_token')) {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  const selectServer = (choice: 'prod' | 'local') => {
    setServerChoice(choice);
    setServerUrl(choice === 'prod' ? PROD_URL : LOCAL_URL);
  };

  const doLogin = async () => {
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    setError('');
    setLoading(true);
    const base = serverUrl.replace(/\/$/, '') || PROD_URL;
    try {
      const res = await fetch(`${base}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError('Неверный email или пароль');
        return;
      }
      const data = await res.json();
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_server', base);
      router.push('/admin/dashboard');
    } catch {
      setError('Ошибка подключения к ' + base);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>SunMind Admin</h1>
        <p style={s.subtitle}>Панель управления продуктом</p>

        <div style={{ marginBottom: 4 }}>
          <div style={s.label}>Сервер</div>
          <div style={s.srvRow}>
            <button type="button" style={srvBtn(serverChoice === 'prod')} onClick={() => selectServer('prod')}>
              Продакшн
            </button>
            <button type="button" style={srvBtn(serverChoice === 'local')} onClick={() => selectServer('local')}>
              Локальный
            </button>
          </div>
          <input
            type="text"
            style={s.input}
            value={serverUrl}
            onChange={(e) => {
              setServerUrl(e.target.value);
              setServerChoice('custom');
            }}
          />
        </div>

        <input
          type="email"
          placeholder="Email администратора"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={s.input}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doLogin()}
          style={s.input}
        />

        <button
          style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          onClick={doLogin}
          disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>

        {error && <div style={s.err}>{error}</div>}
      </div>
    </div>
  );
}
