'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const AdminMapTab = dynamic(() => import('./map-tab'), { ssr: false, loading: () => <Loading /> });

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalDevices: number;
  onlineDevices: number;
  totalZones: number;
  unownedDevices: number;
  offlineOver24h: number;
  lowBatteryDevices: number;
}

interface AdminDevice {
  id: number;
  deviceId: string;
  name: string | null;
  ownerEmail: string | null;
  zoneName: string | null;
  online: boolean;
  lastSeen: string | null;
  batteryPercent: number | null;
  brightness: number | null;
  lux: number | null;
  manualMode: boolean;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  icon: string | null;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  authType: 'Google' | 'Email';
  deviceCount: number;
  zoneCount: number;
}

interface AnalyticsData {
  usersByDay: Array<{ date: string; count: number }>;
  activeDevicesByDay: Array<{ date: string; count: number }>;
  devicesByHour: Array<{ hour: number; count: number }>;
  mostActiveDevices: Array<{ deviceId: string; name: string | null; records: number }>;
  topUsers: Array<{ id: number; name: string; email: string; deviceCount: number }>;
  lowBattery: Array<{ deviceId: string; name: string | null; batteryPercent: number }>;
}

type Tab = 'devices' | 'unowned' | 'users' | 'analytics' | 'notify' | 'map';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fillDays(rows: Array<{ date: string; count: number }>, days = 30) {
  const map: Record<string, number> = {};
  rows.forEach((r) => { map[r.date] = r.count; });
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key.slice(5), count: map[key] ?? 0 });
  }
  return result;
}

function fillHours(rows: Array<{ hour: number; count: number }>) {
  const map: Record<number, number> = {};
  rows.forEach((r) => { map[r.hour] = r.count; });
  return Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: map[h] ?? 0 }));
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru');
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const C = {
  bg: '#0d0f14',
  card: '#171a1f',
  border: '#2a2d35',
  border2: '#1e2128',
  text: '#e2e8f0',
  muted: '#858a95',
  accent: '#f6c343',
  green: '#4ade80',
  red: '#f87171',
  orange: '#fb923c',
  blue: '#60a5fa',
};

// ── Small components ──────────────────────────────────────────────────────────

function Loading() {
  return <div style={{ color: C.muted, fontSize: 14, padding: 40, textAlign: 'center' }}>Загрузка...</div>;
}

function Badge({ type, label }: { type: string; label: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    online:  { bg: '#14532d', color: C.green },
    offline: { bg: '#2a1515', color: C.red },
    google:  { bg: '#1e3a5f', color: C.blue },
    email:   { bg: C.border, color: C.muted },
    auto:    { bg: '#1a2e1a', color: C.green },
    manual:  { bg: '#2a2010', color: C.accent },
    warn:    { bg: '#3f2010', color: C.orange },
  };
  const style = map[type] ?? map.email;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: style.bg,
      color: style.color,
    }}>
      {label}
    </span>
  );
}

function BatBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: C.muted }}>—</span>;
  const color = pct < 20 ? C.red : pct < 50 ? C.orange : C.green;
  const type = pct < 20 ? 'warn' : '';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-block', width: 40, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </span>
      <Badge type={type || 'online'} label={`${pct}%`} />
    </span>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <Loading />;
  const cards = [
    { val: stats.totalUsers,        lbl: 'Пользователей',        warn: false },
    { val: stats.newUsersToday,     lbl: 'Новых сегодня',         warn: false },
    { val: stats.totalDevices,      lbl: 'Устройств всего',       warn: false },
    { val: stats.onlineDevices,     lbl: 'Онлайн сейчас',         warn: false },
    { val: stats.totalZones,        lbl: 'Зон',                   warn: false },
    { val: stats.unownedDevices,    lbl: 'Без владельца',         warn: stats.unownedDevices > 0 },
    { val: stats.offlineOver24h,    lbl: 'Офлайн > 24 ч',        warn: stats.offlineOver24h > 0 },
    { val: stats.lowBatteryDevices, lbl: 'Низкий заряд (< 20%)', warn: stats.lowBatteryDevices > 0 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12, marginBottom: 28 }}>
      {cards.map((c) => (
        <div key={c.lbl} style={{
          background: C.card,
          border: `1px solid ${c.warn ? '#7c3228' : C.border}`,
          borderRadius: 12,
          padding: 18,
        }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: c.warn ? C.red : C.accent }}>{c.val}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{c.lbl}</div>
        </div>
      ))}
    </div>
  );
}

// ── Devices tab ───────────────────────────────────────────────────────────────

function DevicesTab({
  devices,
  loading,
  onRefresh,
  onCtrl,
  onBrightness,
  onMode,
  onDelete,
  onOpenLoc,
}: {
  devices: AdminDevice[];
  loading: boolean;
  onRefresh: () => void;
  onCtrl: (id: string, action: 'on' | 'off') => void;
  onBrightness: (id: string, val: number) => void;
  onMode: (id: string, mode: 'manual' | 'auto') => void;
  onDelete: (id: string) => void;
  onOpenLoc: (d: AdminDevice) => void;
}) {
  return (
    <div>
      <PageHeader title="Все устройства" onRefresh={onRefresh} />
      {loading ? <Loading /> : (
        <TblWrap>
          <table style={tblStyle}>
            <thead>
              <tr>
                {['ID','Название','Владелец','Зона','Статус','Батарея','Яркость','Lux','Режим','Последняя связь','Управление',''].map((h) => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>Устройств нет</td></tr>
              ) : devices.map((d) => (
                <tr key={d.deviceId} style={{ borderBottom: `1px solid ${C.border2}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td><span style={{ fontFamily: 'monospace', color: C.accent }}>{d.deviceId}</span></Td>
                  <Td>{d.name ?? '—'}</Td>
                  <Td>{d.ownerEmail ?? <span style={{ color: C.muted }}>—</span>}</Td>
                  <Td>{d.zoneName ?? '—'}</Td>
                  <Td><Badge type={d.online ? 'online' : 'offline'} label={d.online ? 'Онлайн' : 'Офлайн'} /></Td>
                  <Td><BatBar pct={d.batteryPercent} /></Td>
                  <Td>{d.brightness ?? '—'}</Td>
                  <Td>{d.lux != null ? `${d.lux} lx` : '—'}</Td>
                  <Td><Badge type={d.manualMode ? 'manual' : 'auto'} label={d.manualMode ? 'Ручной' : 'Авто'} /></Td>
                  <Td>{fmtDate(d.lastSeen)}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', minWidth: 260 }}>
                      <CtrlBtn onClick={() => onCtrl(d.deviceId, 'on')} color={C.green} border="#14532d">ВКЛ</CtrlBtn>
                      <CtrlBtn onClick={() => onCtrl(d.deviceId, 'off')} color={C.red} border="#3f1515">ВЫКЛ</CtrlBtn>
                      <span style={{ color: C.border, margin: '0 2px' }}>|</span>
                      <input
                        type="range" min={0} max={100} defaultValue={d.brightness ?? 50}
                        title="Яркость"
                        style={{ width: 80, accentColor: C.accent, cursor: 'pointer', verticalAlign: 'middle' }}
                        onMouseUp={(e) => onBrightness(d.deviceId, Number((e.target as HTMLInputElement).value))}
                      />
                      <span style={{ color: C.border, margin: '0 2px' }}>|</span>
                      <CtrlBtn
                        onClick={() => onMode(d.deviceId, d.manualMode ? 'auto' : 'manual')}
                        color={d.manualMode ? C.green : C.accent}
                        border={d.manualMode ? '#1a2e1a' : '#7c5e10'}>
                        {d.manualMode ? '→ Авто' : '→ Ручной'}
                      </CtrlBtn>
                    </div>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <CtrlBtn onClick={() => onOpenLoc(d)} color={C.blue} border="#1e3a5f">
                        {d.latitude != null ? '📍' : '＋'} Коорд.
                      </CtrlBtn>
                      <CtrlBtn onClick={() => onDelete(d.deviceId)} color={C.red} border="#3f1515">Удалить</CtrlBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TblWrap>
      )}
    </div>
  );
}

// ── Unowned tab ───────────────────────────────────────────────────────────────

function UnownedTab({ devices, loading, onRefresh, onDelete }: {
  devices: AdminDevice[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <PageHeader title="Не привязанные устройства" onRefresh={onRefresh} />
      {loading ? <Loading /> : (
        <TblWrap>
          <table style={tblStyle}>
            <thead>
              <tr>
                {['ID устройства','Статус','Батарея','Яркость','Lux','Последняя связь',''].map((h) => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>Все устройства привязаны к пользователям</td></tr>
              ) : devices.map((d) => (
                <tr key={d.deviceId}
                  onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td><span style={{ fontFamily: 'monospace', color: C.accent }}>{d.deviceId}</span></Td>
                  <Td><Badge type={d.online ? 'online' : 'offline'} label={d.online ? 'Онлайн' : 'Офлайн'} /></Td>
                  <Td><BatBar pct={d.batteryPercent} /></Td>
                  <Td>{d.brightness ?? '—'}</Td>
                  <Td>{d.lux != null ? `${d.lux} lx` : '—'}</Td>
                  <Td>{fmtDate(d.lastSeen)}</Td>
                  <Td><CtrlBtn onClick={() => onDelete(d.deviceId)} color={C.red} border="#3f1515">Удалить</CtrlBtn></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TblWrap>
      )}
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ users, loading, onRefresh, onDelete }: {
  users: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: number, email: string) => void;
}) {
  return (
    <div>
      <PageHeader title="Пользователи" onRefresh={onRefresh} />
      {loading ? <Loading /> : (
        <TblWrap>
          <table style={tblStyle}>
            <thead>
              <tr>
                {['ID','Имя','Email','Вход','Устройств','Зон','Регистрация',''].map((h) => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>Пользователей нет</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}
                  onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Td>{u.id}</Td>
                  <Td>{u.name}</Td>
                  <Td>{u.email}</Td>
                  <Td><Badge type={u.authType === 'Google' ? 'google' : 'email'} label={u.authType} /></Td>
                  <Td style={{ textAlign: 'center' }}>{u.deviceCount}</Td>
                  <Td style={{ textAlign: 'center' }}>{u.zoneCount}</Td>
                  <Td>{fmtDate(u.createdAt)}</Td>
                  <Td><CtrlBtn onClick={() => onDelete(u.id, u.email)} color={C.red} border="#3f1515">Удалить</CtrlBtn></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TblWrap>
      )}
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ data, loading, onRefresh }: {
  data: AnalyticsData | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div>
      <PageHeader title="Аналитика" onRefresh={onRefresh} />
      {loading || !data ? <Loading /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <ChartCard title="Регистрации пользователей (30 дней)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={fillDays(data.usersByDay)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border2} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
                  <Line type="monotone" dataKey="count" stroke={C.accent} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Активные устройства по дням (30 дней)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={fillDays(data.activeDevicesByDay)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border2} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
                  <Line type="monotone" dataKey="count" stroke={C.blue} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ marginBottom: 24 }}>
            <ChartCard title="Активность устройств по часам сегодня">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fillHours(data.devicesByHour)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border2} />
                  <XAxis dataKey="hour" tick={{ fill: C.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
                  <Bar dataKey="count" fill="rgba(74,222,128,0.7)" stroke={C.green} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <ATableCard title="Топ пользователей">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th2>#</Th2><Th2>Пользователь</Th2><Th2>Устройств</Th2></tr></thead>
                <tbody>
                  {data.topUsers.map((u, i) => (
                    <tr key={u.id}
                      onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Td2><Rank>{i + 1}</Rank></Td2>
                      <Td2>
                        <div style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{u.email}</div>
                      </Td2>
                      <Td2 style={{ color: C.accent, fontWeight: 700 }}>{u.deviceCount}</Td2>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ATableCard>

            <ATableCard title="Самые активные устройства (7 дней)">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th2>#</Th2><Th2>ID устройства</Th2><Th2>Записей</Th2></tr></thead>
                <tbody>
                  {data.mostActiveDevices.map((d, i) => (
                    <tr key={d.deviceId}
                      onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Td2><Rank>{i + 1}</Rank></Td2>
                      <Td2>
                        <div style={{ fontFamily: 'monospace', color: C.accent }}>{d.deviceId}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{d.name ?? '—'}</div>
                      </Td2>
                      <Td2 style={{ fontWeight: 700 }}>{d.records}</Td2>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ATableCard>

            <ATableCard title="Низкий заряд батареи">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><Th2>Устройство</Th2><Th2>Заряд</Th2></tr></thead>
                <tbody>
                  {data.lowBattery.map((b) => (
                    <tr key={b.deviceId}
                      onMouseEnter={e => (e.currentTarget.style.background = C.border2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Td2>
                        <div style={{ fontFamily: 'monospace', color: C.accent }}>{b.deviceId}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{b.name ?? '—'}</div>
                      </Td2>
                      <Td2><BatBar pct={b.batteryPercent} /></Td2>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ATableCard>
          </div>
        </>
      )}
    </div>
  );
}

// ── Notify tab ────────────────────────────────────────────────────────────────

function NotifyTab({ users, token, baseUrl }: { users: AdminUser[]; token: string; baseUrl: string }) {
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title || !message) { setStatus({ ok: false, text: 'Заполните заголовок и сообщение' }); return; }
    setSending(true);
    setStatus(null);
    try {
      const body: Record<string, unknown> = { title, message };
      if (target) body.userId = Number(target);
      const res = await fetch(`${baseUrl}/admin/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, text: target ? `Отправлено: ${data.sent}, ошибок: ${data.failed}` : `Рассылка завершена. Отправлено: ${data.sent}, ошибок: ${data.failed}` });
      } else {
        setStatus({ ok: false, text: `Ошибка ${res.status}: ${data?.message ?? 'Неизвестная ошибка'}` });
      }
    } catch (e: unknown) {
      setStatus({ ok: false, text: 'Ошибка соединения: ' + (e instanceof Error ? e.message : String(e)) });
    } finally {
      setSending(false);
    }
  };

  const notifyInput: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: '#0d0f14',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Уведомления</h2>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, maxWidth: 560 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: C.accent }}>Отправить уведомление</h2>
        <NLabel>Кому</NLabel>
        <select value={target} onChange={(e) => setTarget(e.target.value)}
          style={{ ...notifyInput, marginBottom: 0 }}>
          <option value="">Всем пользователям</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <NLabel>Заголовок</NLabel>
        <input style={notifyInput} placeholder="Например: Важное обновление" value={title} onChange={(e) => setTitle(e.target.value)} />
        <NLabel>Сообщение</NLabel>
        <textarea
          style={{ ...notifyInput, height: 90, resize: 'vertical', display: 'block' }}
          placeholder="Текст уведомления..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={send}
          disabled={sending}
          style={{ marginTop: 20, padding: '12px 28px', background: C.accent, color: '#0d0f14', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.5 : 1 }}>
          {sending ? 'Отправка...' : 'Отправить'}
        </button>
        {status && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, fontSize: 14, background: status.ok ? '#14532d' : '#3f1515', color: status.ok ? C.green : C.red }}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Location modal ────────────────────────────────────────────────────────────

function LocModal({ device, token, baseUrl, onClose, onSaved }: {
  device: AdminDevice | null;
  token: string;
  baseUrl: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  useEffect(() => {
    if (device) {
      setLat(device.latitude != null ? String(device.latitude) : '');
      setLng(device.longitude != null ? String(device.longitude) : '');
    }
  }, [device]);

  if (!device) return null;

  const save = async () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (isNaN(la) || isNaN(ln)) { alert('Введите корректные координаты'); return; }
    await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(device.deviceId)}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ latitude: la, longitude: ln }),
    });
    onSaved();
    onClose();
  };

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: '#0d0f14',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 9999, alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 400, maxWidth: '96vw' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginBottom: 18 }}>
          Координаты: {device.name || device.deviceId}
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <NLabel>Широта (Latitude)</NLabel>
            <input type="number" style={inp} placeholder="42.8746" step={0.000001} value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <NLabel>Долгота (Longitude)</NLabel>
            <input type="number" style={inp} placeholder="74.5698" step={0.000001} value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            Отмена
          </button>
          <button onClick={save} style={{ flex: 1, padding: 11, background: C.accent, color: '#0d0f14', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utility sub-components ────────────────────────────────────────────────────

function PageHeader({ title, onRefresh }: { title: string; onRefresh: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{title}</h2>
      <button onClick={onRefresh} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
        ⟳ Обновить
      </button>
    </div>
  );
}

function TblWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>{children}</div>;
}

const tblStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: C.card, minWidth: 700 };

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{children}</th>;
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '11px 14px', fontSize: 13, whiteSpace: 'nowrap', ...style }}>{children}</td>;
}

function Th2({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '8px 12px', fontSize: 11, color: C.muted, textTransform: 'uppercase', borderBottom: `1px solid ${C.border2}`, textAlign: 'left' }}>{children}</th>;
}

function Td2({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: `1px solid ${C.border2}`, ...style }}>{children}</td>;
}

function CtrlBtn({ children, onClick, color, border }: { children: React.ReactNode; onClick: () => void; color: string; border: string }) {
  return (
    <button onClick={onClick} style={{ background: 'transparent', border: `1px solid ${border}`, color, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, transition: 'all .15s' }}>
      {children}
    </button>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function ATableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>{title}</h3>
      {children}
    </div>
  );
}

function Rank({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-block', width: 20, height: 20, background: C.border, borderRadius: '50%', textAlign: 'center', lineHeight: '20px', fontSize: 11, fontWeight: 700, marginRight: 6 }}>{children}</span>;
}

function NLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', fontWeight: 600 }}>{children}</div>;
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://sunmindthebestbackend-production.up.railway.app');
  const [activeTab, setActiveTab] = useState<Tab>('devices');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [unowned, setUnowned] = useState<AdminDevice[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const [devLoading, setDevLoading] = useState(false);
  const [unownedLoading, setUnownedLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [locDevice, setLocDevice] = useState<AdminDevice | null>(null);

  const tokenRef = useRef(token);
  tokenRef.current = token;
  const baseRef = useRef(baseUrl);
  baseRef.current = baseUrl;

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    const b = localStorage.getItem('admin_server') || 'https://sunmindthebestbackend-production.up.railway.app';
    if (!t) { router.replace('/admin'); return; }
    setToken(t);
    setBaseUrl(b);
  }, [router]);

  const apiFetch = useCallback(async (path: string) => {
    const res = await fetch(`${baseRef.current}${path}`, {
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    });
    if (res.status === 401) { localStorage.removeItem('admin_token'); router.replace('/admin'); return null; }
    return res.json();
  }, [router]);

  const loadStats = useCallback(async () => {
    const d = await apiFetch('/admin/stats');
    if (d) setStats(d);
  }, [apiFetch]);

  const loadDevices = useCallback(async () => {
    setDevLoading(true);
    const d = await apiFetch('/admin/devices');
    if (d) setDevices(d);
    setDevLoading(false);
  }, [apiFetch]);

  const loadUnowned = useCallback(async () => {
    setUnownedLoading(true);
    const d = await apiFetch('/admin/unowned');
    if (d) setUnowned(d);
    setUnownedLoading(false);
  }, [apiFetch]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const d = await apiFetch('/admin/users');
    if (d) setUsers(d);
    setUsersLoading(false);
  }, [apiFetch]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    const d = await apiFetch('/admin/analytics');
    if (d) setAnalytics(d);
    setAnalyticsLoading(false);
  }, [apiFetch]);

  useEffect(() => {
    if (!token) return;
    loadStats();
    loadDevices();
  }, [token, loadStats, loadDevices]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'users' && users.length === 0) loadUsers();
    if (tab === 'unowned') loadUnowned();
    if (tab === 'analytics' && !analytics) loadAnalytics();
    if (tab === 'notify' && users.length === 0) loadUsers();
    if (tab === 'map' && devices.length === 0) loadDevices();
  };

  const ctrlDevice = async (deviceId: string, action: 'on' | 'off') => {
    await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(deviceId)}/${action}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
  };

  const ctrlBrightness = async (deviceId: string, value: number) => {
    await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(deviceId)}/brightness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ value }),
    });
  };

  const ctrlMode = async (deviceId: string, mode: 'manual' | 'auto') => {
    await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(deviceId)}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode }),
    });
    loadDevices();
  };

  const delDevice = async (deviceId: string) => {
    if (!confirm(`Удалить устройство ${deviceId}?`)) return;
    await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    loadDevices(); loadStats(); loadUnowned();
  };

  const delUser = async (id: number, email: string) => {
    if (!confirm(`Удалить пользователя ${email}?\nЭто удалит все его данные.`)) return;
    await fetch(`${baseUrl}/admin/users/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    loadUsers(); loadStats();
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/admin');
  };

  const navItems: Array<{ id: Tab; icon: string; label: string }> = [
    { id: 'devices',   icon: '📡', label: 'Все устройства' },
    { id: 'unowned',   icon: '🔗', label: 'Не привязанные' },
    { id: 'users',     icon: '👥', label: 'Пользователи' },
    { id: 'analytics', icon: '📊', label: 'Аналитика' },
    { id: 'notify',    icon: '🔔', label: 'Уведомления' },
    { id: 'map',       icon: '🗺',  label: 'Карта' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: C.text }}>
      {/* Sidebar */}
      <nav style={{ width: 230, background: '#111318', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 18px 18px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.accent }}>SunMind Admin</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Панель управления</div>
        </div>

        <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                color: activeTab === item.id ? C.accent : C.muted,
                border: 'none',
                background: activeTab === item.id ? C.border2 : 'transparent',
                width: '100%',
                textAlign: 'left',
                marginBottom: 2,
                fontWeight: 500,
                transition: 'background .15s, color .15s',
              }}>
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.muted, padding: '6px 10px', background: C.border2, borderRadius: 8, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {baseUrl}
          </div>
          <button
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            ↩ Выйти
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
        <div style={{ padding: 24, maxWidth: 1400 }}>
          <StatsRow stats={stats} />

          {activeTab === 'devices' && (
            <DevicesTab
              devices={devices}
              loading={devLoading}
              onRefresh={loadDevices}
              onCtrl={ctrlDevice}
              onBrightness={ctrlBrightness}
              onMode={ctrlMode}
              onDelete={delDevice}
              onOpenLoc={(d) => setLocDevice(d)}
            />
          )}
          {activeTab === 'unowned' && (
            <UnownedTab devices={unowned} loading={unownedLoading} onRefresh={loadUnowned} onDelete={delDevice} />
          )}
          {activeTab === 'users' && (
            <UsersTab users={users} loading={usersLoading} onRefresh={loadUsers} onDelete={delUser} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab data={analytics} loading={analyticsLoading} onRefresh={loadAnalytics} />
          )}
          {activeTab === 'notify' && (
            <NotifyTab users={users} token={token} baseUrl={baseUrl} />
          )}
          {activeTab === 'map' && (
            <AdminMapTab devices={devices} token={token} baseUrl={baseUrl} onRefresh={loadDevices} />
          )}
        </div>
      </div>

      {/* Location modal */}
      <LocModal
        device={locDevice}
        token={token}
        baseUrl={baseUrl}
        onClose={() => setLocDevice(null)}
        onSaved={loadDevices}
      />
    </div>
  );
}
