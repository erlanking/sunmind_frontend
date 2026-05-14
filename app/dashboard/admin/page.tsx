'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';
import type { DeviceStatus } from '@/lib/api/types';

const DevicesMap = dynamic(
  () => import('@/components/map/devices-map').then((m) => ({ default: m.DevicesMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800">
        Загрузка карты...
      </div>
    ),
  },
);

const LocationModal = dynamic(
  () => import('@/components/map/location-modal').then((m) => ({ default: m.LocationModal })),
  { ssr: false },
);

export default function AdminPage() {
  const { isAuthenticated } = useAuthStore();
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [modalDevice, setModalDevice] = useState<DeviceStatus | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.getDevices().then(setDevices).catch(() => {});
  }, [isAuthenticated]);

  const handleSaveCoords = async (deviceId: string, lat: number, lng: number) => {
    await apiClient.updateDevice(deviceId, { latitude: lat, longitude: lng });
    setDevices((prev) =>
      prev.map((d) => (d.deviceId === deviceId ? { ...d, latitude: lat, longitude: lng } : d)),
    );
    toast.success('Координаты сохранены');
    setModalDevice(null);
  };

  const statusInfo = (d: DeviceStatus) => {
    if (!d.connected)
      return { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', text: 'Оффлайн' };
    if (d.batteryPercent != null && d.batteryPercent < 20)
      return { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', text: 'Низкий заряд' };
    return { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', text: 'Онлайн' };
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Карта панелей</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Нажмите «Координаты» у устройства, чтобы разместить его на карте
            </p>
          </div>

          {/* Легенда */}
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            {[
              { color: 'bg-green-500', label: 'Онлайн' },
              { color: 'bg-yellow-400', label: 'Низкий заряд' },
              { color: 'bg-gray-400', label: 'Оффлайн' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Карта */}
          <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
            <DevicesMap
              devices={devices}
              placingDeviceId={null}
              onMapClick={() => {}}
              onDeviceClick={(id) => {
                const d = devices.find((x) => x.deviceId === id);
                if (d) setModalDevice(d);
              }}
            />
          </div>

          {/* Таблица устройств */}
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Устройства ({devices.length})
          </h2>

          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
              <p className="text-gray-500">Нет зарегистрированных устройств</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Устройство</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">АКБ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Свет</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Координаты</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {devices.map((device) => {
                    const st = statusInfo(device);
                    return (
                      <tr key={device.deviceId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {device.name || device.deviceId}
                          </p>
                          {device.name && (
                            <p className="font-mono text-xs text-gray-400">{device.deviceId}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            {st.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {device.batteryPercent != null ? `${device.batteryPercent}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {device.lux != null ? `${device.lux} лк` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {device.latitude != null
                            ? `${device.latitude.toFixed(4)}, ${device.longitude!.toFixed(4)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setModalDevice(device)}
                            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20">
                            {device.latitude != null ? '📍 Координаты' : '＋ Координаты'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно с картой */}
      {modalDevice && (
        <LocationModal
          device={modalDevice}
          onSave={handleSaveCoords}
          onClose={() => setModalDevice(null)}
        />
      )}
    </ProtectedRoute>
  );
}
