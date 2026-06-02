'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DeviceStatus } from '@/lib/api/types';

function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const createDotIcon = (color: string, pulse = false, label?: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
          ${pulse ? `<div style="position:absolute;width:20px;height:20px;border-radius:50%;background:${color};opacity:0.3;animation:ping 1.5s ease-in-out infinite;"></div>` : ''}
          <div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
        </div>
        ${label ? `<div style="background:white;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2);color:#111;">${label}</div>` : ''}
      </div>
      <style>@keyframes ping{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.8);opacity:0}}</style>
    `,
    iconSize: [20, label ? 36 : 20],
    iconAnchor: [10, label ? 36 : 10],
    popupAnchor: [0, -10],
  });

const STATUS_COLORS = { online: '#22c55e', warning: '#f59e0b', offline: '#6b7280' };

function getDeviceIcon(device: DeviceStatus, isSelected: boolean) {
  const label = isSelected ? (device.name || device.deviceId) : undefined;
  if (!device.connected) return createDotIcon(STATUS_COLORS.offline, false, label);
  if (device.batteryPercent != null && device.batteryPercent < 20)
    return createDotIcon(STATUS_COLORS.warning, true, label);
  return createDotIcon(STATUS_COLORS.online, true, label);
}

// Обработчик клика по карте
function MapClickHandler({
  placingDeviceId,
  onMapClick,
}: {
  placingDeviceId: string | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (placingDeviceId) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface Props {
  devices: DeviceStatus[];
  placingDeviceId: string | null;
  onMapClick: (lat: number, lng: number) => void;
  onDeviceClick?: (deviceId: string) => void;
}

export function DevicesMap({ devices, placingDeviceId, onMapClick, onDeviceClick }: Props) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const devicesWithCoords = devices.filter((d) => d.latitude != null && d.longitude != null);

  const center: [number, number] =
    devicesWithCoords.length > 0
      ? [devicesWithCoords[0].latitude!, devicesWithCoords[0].longitude!]
      : [43.238, 76.945];

  const placingDevice = placingDeviceId ? devices.find((d) => d.deviceId === placingDeviceId) : null;

  return (
    <div className="relative">
      {/* Подсказка при размещении */}
      {placingDevice && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Нажмите на карту, чтобы разместить «{placingDevice.name || placingDevice.deviceId}»
        </div>
      )}

      <MapContainer
        center={center}
        zoom={devicesWithCoords.length > 0 ? 14 : 12}
        style={{
          height: '440px',
          width: '100%',
          borderRadius: '0.75rem',
          cursor: placingDeviceId ? 'crosshair' : 'grab',
        }}
        className="z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler placingDeviceId={placingDeviceId} onMapClick={onMapClick} />

        {devicesWithCoords.map((device) => (
          <Marker
            key={device.deviceId}
            position={[device.latitude!, device.longitude!]}
            icon={getDeviceIcon(device, device.deviceId === placingDeviceId)}
            eventHandlers={{ click: () => onDeviceClick?.(device.deviceId) }}>
            <Popup>
              <div className="min-w-[150px] text-sm">
                <p className="mb-1 font-semibold text-gray-900">{device.name || device.deviceId}</p>
                <p className={device.connected ? 'text-green-600' : 'text-gray-500'}>
                  {device.connected ? '● Онлайн' : '● Оффлайн'}
                </p>
                {device.batteryPercent != null && (
                  <p className="text-gray-600">АКБ: {device.batteryPercent}%</p>
                )}
                {device.lux != null && <p className="text-gray-600">Свет: {device.lux} лк</p>}
                <p className="mt-1 text-xs text-gray-400">
                  {device.latitude!.toFixed(5)}, {device.longitude!.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
