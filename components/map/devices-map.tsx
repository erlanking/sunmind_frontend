'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DeviceStatus } from '@/lib/api/types';

// Фикс иконок Leaflet при сборке webpack/Next.js
function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const createDotIcon = (color: string, pulse = false) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
        ${pulse ? `<div style="position:absolute;width:20px;height:20px;border-radius:50%;background:${color};opacity:0.3;animation:ping 1.5s ease-in-out infinite;"></div>` : ''}
        <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
      </div>
      <style>@keyframes ping{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.8);opacity:0}}</style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });

const STATUS_COLORS = {
  online: '#22c55e',
  warning: '#f59e0b',
  offline: '#6b7280',
};

function getDeviceIcon(device: DeviceStatus) {
  if (!device.connected) return createDotIcon(STATUS_COLORS.offline);
  if (device.batteryPercent != null && device.batteryPercent < 20)
    return createDotIcon(STATUS_COLORS.warning, true);
  return createDotIcon(STATUS_COLORS.online, true);
}

interface Props {
  devices: DeviceStatus[];
  onDeviceClick?: (deviceId: string) => void;
}

export function DevicesMap({ devices, onDeviceClick }: Props) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const devicesWithCoords = devices.filter(
    (d) => d.latitude != null && d.longitude != null,
  );

  const center: [number, number] =
    devicesWithCoords.length > 0
      ? [devicesWithCoords[0].latitude!, devicesWithCoords[0].longitude!]
      : [43.238, 76.945]; // Алматы по умолчанию

  return (
    <MapContainer
      center={center}
      zoom={devicesWithCoords.length > 0 ? 14 : 12}
      style={{ height: '420px', width: '100%', borderRadius: '0.75rem' }}
      className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {devicesWithCoords.map((device) => (
        <Marker
          key={device.deviceId}
          position={[device.latitude!, device.longitude!]}
          icon={getDeviceIcon(device)}
          eventHandlers={{
            click: () => onDeviceClick?.(device.deviceId),
          }}>
          <Popup>
            <div className="min-w-[140px] text-sm">
              <p className="mb-1 font-semibold text-gray-900">{device.name || device.deviceId}</p>
              <p className={device.connected ? 'text-green-600' : 'text-gray-500'}>
                {device.connected ? '● Онлайн' : '● Оффлайн'}
              </p>
              {device.batteryPercent != null && (
                <p className="text-gray-600">АКБ: {device.batteryPercent}%</p>
              )}
              {device.lux != null && (
                <p className="text-gray-600">Свет: {device.lux} лк</p>
              )}
              {device.temperature != null && (
                <p className="text-gray-600">Темп: {device.temperature}°C</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {devicesWithCoords.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 1000,
            background: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '14px',
            color: '#6b7280',
          }}>
          Нет устройств с координатами
        </div>
      )}
    </MapContainer>
  );
}
