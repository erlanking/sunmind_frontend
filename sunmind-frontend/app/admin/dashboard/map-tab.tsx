'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';

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

const C = {
  bg: '#0d0f14',
  card: '#171a1f',
  border: '#2a2d35',
  text: '#e2e8f0',
  muted: '#858a95',
  accent: '#f6c343',
  green: '#4ade80',
  red: '#f87171',
  orange: '#fb923c',
};

const ICON_OPTIONS = ['☀️','🌤️','⚡','🔋','💡','🏭','🏗️','🌿','🔆','📡','🛰️','⭐','🌞','🔌','🏠','🌱','💎','🔥','❄️','🎯'];

const CARD_PALETTES = [
  { bg: 'linear-gradient(135deg,#f6c343 0%,#e07a0e 100%)', shadow: 'rgba(246,195,67,.4)' },
  { bg: 'linear-gradient(135deg,#60a5fa 0%,#2563eb 100%)', shadow: 'rgba(96,165,250,.4)' },
  { bg: 'linear-gradient(135deg,#4ade80 0%,#16a34a 100%)', shadow: 'rgba(74,222,128,.4)' },
  { bg: 'linear-gradient(135deg,#f472b6 0%,#be185d 100%)', shadow: 'rgba(244,114,182,.4)' },
  { bg: 'linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)', shadow: 'rgba(167,139,250,.4)' },
  { bg: 'linear-gradient(135deg,#fb923c 0%,#c2410c 100%)', shadow: 'rgba(251,146,60,.4)' },
  { bg: 'linear-gradient(135deg,#34d399 0%,#065f46 100%)', shadow: 'rgba(52,211,153,.4)' },
  { bg: 'linear-gradient(135deg,#f87171 0%,#b91c1c 100%)', shadow: 'rgba(248,113,113,.4)' },
];

function getIconCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('sm_icons') || '{}'); } catch { return {}; }
}

function saveIconCache(cache: Record<string, string>) {
  localStorage.setItem('sm_icons', JSON.stringify(cache));
}

function getDeviceIcon(device: AdminDevice, cache: Record<string, string>): string {
  return cache[device.deviceId] || device.icon || '☀️';
}

export default function AdminMapTab({
  devices,
  token,
  baseUrl,
  onRefresh,
}: {
  devices: AdminDevice[];
  token: string;
  baseUrl: string;
  onRefresh: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const [iconCache, setIconCache] = useState<Record<string, string>>(getIconCache);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [pickerDeviceId, setPickerDeviceId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  // Merge icon cache from device data
  useEffect(() => {
    const cache = { ...iconCache };
    let changed = false;
    devices.forEach((d) => {
      if (d.icon && cache[d.deviceId] !== d.icon) {
        cache[d.deviceId] = d.icon;
        changed = true;
      }
    });
    if (changed) {
      setIconCache(cache);
      saveIconCache(cache);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  useEffect(() => {
    // Dynamically import Leaflet (browser-only)
    import('leaflet').then((L) => {
      // Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mapContainerRef.current) return;

      // Remove old map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
      mapContainerRef.current.innerHTML = '';

      const withCoords = devices.filter((d) => d.latitude != null && d.longitude != null);
      let cLat = 42.8746, cLng = 74.5698;
      if (withCoords.length > 0) {
        cLat = withCoords.reduce((s, d) => s + d.latitude!, 0) / withCoords.length;
        cLng = withCoords.reduce((s, d) => s + d.longitude!, 0) / withCoords.length;
      }

      const map = L.map(mapContainerRef.current).setView([cLat, cLng], withCoords.length > 0 ? 12 : 10);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const makeIcon = (color: string, pulse: boolean, emoji: string) => {
        const ring = pulse
          ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.3;animation:mpulse 1.5s ease-in-out infinite"></div>`
          : '';
        const emojiEl = emoji
          ? `<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);font-size:18px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">${emoji}</div>`
          : '';
        return L.divIcon({
          className: '',
          html: `<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center">
            ${emojiEl}${ring}
            <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>
          </div>
          <style>@keyframes mpulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.9);opacity:0}}</style>`,
          iconSize: [20, 36],
          iconAnchor: [10, 36],
          popupAnchor: [0, -36],
        });
      };

      const cache = getIconCache();
      withCoords.forEach((d) => {
        const emoji = cache[d.deviceId] || d.icon || '☀️';
        const color = !d.online ? C.red : (d.batteryPercent != null && d.batteryPercent < 20 ? C.orange : C.green);
        const icon = makeIcon(color, d.online, emoji);
        const bat = d.batteryPercent != null ? d.batteryPercent + '%' : '—';
        const status = d.online
          ? `<span style="color:#4ade80;font-weight:700">● Онлайн</span>`
          : `<span style="color:#f87171;font-weight:700">● Офлайн</span>`;
        const popup = `<div style="font-family:-apple-system,sans-serif;min-width:180px">
          <div style="font-size:14px;font-weight:700;margin-bottom:5px">${d.name || d.deviceId}</div>
          <div style="font-size:12px;color:#555;margin-bottom:3px">ID: ${d.deviceId}</div>
          <div style="font-size:12px;margin-bottom:2px">${status}</div>
          <div style="font-size:12px;color:#555">АКБ: ${bat}</div>
          <div style="font-size:11px;color:#999;margin-top:4px">${d.latitude!.toFixed(5)}, ${d.longitude!.toFixed(5)}</div>
        </div>`;
        markersRef.current[d.deviceId] = L.marker([d.latitude!, d.longitude!], { icon })
          .addTo(map)
          .bindPopup(popup);
      });

      // Click on map to place device
      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const currentPlacing = (window as Record<string, unknown>).__sm_placing as string | null;
        if (!currentPlacing) return;
        const { lat, lng } = e.latlng;
        await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(currentPlacing)}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        });
        (window as Record<string, unknown>).__sm_placing = null;
        setPlacingId(null);
        onRefresh();
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, token, baseUrl]);

  const handlePlaceToggle = (deviceId: string) => {
    const next = placingId === deviceId ? null : deviceId;
    setPlacingId(next);
    (window as Record<string, unknown>).__sm_placing = next;
    if (mapRef.current) {
      const container = mapContainerRef.current;
      if (container) container.style.cursor = next ? 'crosshair' : 'grab';
    }
  };

  const handleIconClick = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    setPickerDeviceId(pickerDeviceId === deviceId ? null : deviceId);
    setPickerPos({ x: e.clientX, y: e.clientY });
  };

  const handleSelectIcon = async (icon: string) => {
    if (!pickerDeviceId) return;
    const cache = { ...iconCache, [pickerDeviceId]: icon };
    setIconCache(cache);
    saveIconCache(cache);
    setPickerDeviceId(null);
    await fetch(`${baseUrl}/admin/devices/${encodeURIComponent(pickerDeviceId)}/icon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ icon }),
    }).catch(() => {});
  };

  return (
    <div onClick={() => setPickerDeviceId(null)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Карта устройств</h2>
        <button onClick={onRefresh} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          ⟳ Обновить
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ color: C.green, label: 'Онлайн' }, { color: C.orange, label: 'Низкий заряд' }, { color: C.red, label: 'Офлайн' }].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ position: 'relative', marginBottom: 22 }}>
        {placingId && (
          <div style={{ display: 'block', position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: C.accent, color: '#0d0f14', fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 999, boxShadow: `0 2px 12px rgba(246,195,67,.5)`, whiteSpace: 'nowrap' }}>
            Нажмите на карту, чтобы разместить «{devices.find((d) => d.deviceId === placingId)?.name || placingId}»
          </div>
        )}
        <div ref={mapContainerRef} style={{ height: 480, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, cursor: 'grab' }} />
      </div>

      {/* Device cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
        {devices.map((d, i) => {
          const palette = CARD_PALETTES[i % CARD_PALETTES.length];
          const hasCoords = d.latitude != null && d.longitude != null;
          const isPlacing = placingId === d.deviceId;
          const coords = hasCoords ? `${d.latitude!.toFixed(5)}, ${d.longitude!.toFixed(5)}` : '';
          const meta = [
            d.batteryPercent != null ? `АКБ: ${d.batteryPercent}%` : null,
            d.lux != null ? `${d.lux} лк` : null,
            d.brightness != null ? `Ярк: ${d.brightness}` : null,
          ].filter(Boolean).join(' · ') || '—';
          const statusText = !d.online ? 'Офлайн' : (d.batteryPercent != null && d.batteryPercent < 20 ? '⚠ Заряд' : 'Онлайн');
          const deviceIcon = getDeviceIcon(d, iconCache);

          const btnStyle: React.CSSProperties = {
            width: '100%',
            padding: 8,
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all .15s',
            background: isPlacing ? C.accent : 'rgba(255,255,255,.15)',
            color: isPlacing ? '#0d0f14' : '#fff',
          };

          return (
            <div
              key={d.deviceId}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'transform .15s,box-shadow .15s',
                background: palette.bg,
                boxShadow: `0 4px 16px ${palette.shadow}`,
              }}>
              <div style={{ padding: '18px 16px 14px', position: 'relative', minHeight: 90 }}>
                <span
                  title="Нажмите, чтобы изменить иконку"
                  onClick={(e) => handleIconClick(e, d.deviceId)}
                  style={{ cursor: 'pointer', display: 'block', fontSize: 28, marginBottom: 8, transition: 'transform .15s' }}>
                  {deviceIcon}
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name || d.deviceId}</div>
                {d.name && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontFamily: 'monospace', marginTop: 2 }}>{d.deviceId}</div>}
                <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'rgba(0,0,0,.3)', color: '#fff' }}>{statusText}</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,.25)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 3 }}>{meta}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace', marginBottom: 10, minHeight: 14 }}>{coords}</div>
                <button style={btnStyle} onClick={() => handlePlaceToggle(d.deviceId)}>
                  {isPlacing ? '✕ Отмена' : hasCoords ? '📍 Переместить' : '＋ Разместить'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Icon picker popup */}
      {pickerDeviceId && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: Math.min(pickerPos.x, window.innerWidth - 240),
            top: pickerPos.y + 8,
            zIndex: 2000,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,.6)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            width: 220,
          }}>
          {ICON_OPTIONS.map((ic) => (
            <span
              key={ic}
              onClick={() => handleSelectIcon(ic)}
              style={{
                fontSize: 22,
                cursor: 'pointer',
                padding: 5,
                borderRadius: 8,
                transition: 'background .1s',
                lineHeight: 1,
                border: iconCache[pickerDeviceId] === ic ? `2px solid ${C.accent}` : '2px solid transparent',
                background: iconCache[pickerDeviceId] === ic ? C.border : 'transparent',
              }}>
              {ic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
