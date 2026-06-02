'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  device: DeviceStatus;
  onSave: (deviceId: string, lat: number, lng: number) => void;
  onClose: () => void;
}

export function LocationModal({ device, onSave, onClose }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    device.latitude != null && device.longitude != null
      ? { lat: device.latitude, lng: device.longitude }
      : null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const center: [number, number] = coords
    ? [coords.lat, coords.lng]
    : device.latitude != null
      ? [device.latitude!, device.longitude!]
      : [43.238, 76.945];

  const handleSave = async () => {
    if (!coords) return;
    setSaving(true);
    try {
      await onSave(device.deviceId, coords.lat, coords.lng);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Местоположение устройства
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {device.name || device.deviceId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hint */}
        <div className="bg-orange-50 px-6 py-2.5 text-sm text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
          Нажмите на карту, чтобы выбрать координаты
        </div>

        {/* Map */}
        <div className="h-64">
          <MapContainer
            center={center}
            zoom={coords ? 15 : 12}
            style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
            className="z-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={(lat, lng) => setCoords({ lat, lng })} />
            {coords && <Marker position={[coords.lat, coords.lng]} />}
          </MapContainer>
        </div>

        {/* Coords display */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-700">
          {coords ? (
            <p className="font-mono text-sm text-gray-600 dark:text-gray-400">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Точка не выбрана</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!coords || saving}
            className="flex-1 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
