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

export default function AdminPage() {
  const { isAuthenticated } = useAuthStore();
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [placingDeviceId, setPlacingDeviceId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.getDevices().then(setDevices).catch(() => {});
  }, [isAuthenticated]);

  // Клик по карте — сохраняем координаты выбранного устройства
  const handleMapClick = async (lat: number, lng: number) => {
    if (!placingDeviceId) return;
    setSaving(placingDeviceId);
    try {
      await apiClient.updateDevice(placingDeviceId, { latitude: lat, longitude: lng });
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === placingDeviceId ? { ...d, latitude: lat, longitude: lng } : d,
        ),
      );
      const device = devices.find((d) => d.deviceId === placingDeviceId);
      toast.success(`«${device?.name || placingDeviceId}» размещена на карте`);
      setPlacingDeviceId(null);
    } catch {
      toast.error('Не удалось сохранить координаты');
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveCoords = async (deviceId: string) => {
    setSaving(deviceId);
    try {
      await apiClient.updateDevice(deviceId, { latitude: null, longitude: null });
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === deviceId ? { ...d, latitude: null, longitude: null } : d)),
      );
      toast.success('Метка удалена с карты');
    } catch {
      toast.error('Ошибка');
    } finally {
      setSaving(null);
    }
  };

  const statusInfo = (d: DeviceStatus) => {
    if (!d.connected)
      return { text: 'Оффлайн', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
    if (d.batteryPercent != null && d.batteryPercent < 20)
      return { text: 'Низкий заряд', dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { text: 'Онлайн', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  const hasCoords = (d: DeviceStatus) => d.latitude != null && d.longitude != null;
  const isPlacing = (d: DeviceStatus) => d.deviceId === placingDeviceId;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Заголовок */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Карта панелей</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Выберите панель ниже и нажмите на карту, чтобы разместить её
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
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
            <DevicesMap
              devices={devices}
              placingDeviceId={placingDeviceId}
              onMapClick={handleMapClick}
              onDeviceClick={(id) => setPlacingDeviceId((prev) => (prev === id ? null : id))}
            />
          </div>

          {/* Список панелей */}
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Панели ({devices.length})
          </h2>

          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
              <p className="text-gray-500">Нет зарегистрированных устройств</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => {
                const st = statusInfo(device);
                const placing = isPlacing(device);
                const coords = hasCoords(device);

                return (
                  <div
                    key={device.deviceId}
                    className={`rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-800 ${
                      placing
                        ? 'border-orange-500 ring-2 ring-orange-500/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    {/* Название + статус */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {device.name || device.deviceId}
                          </p>
                          {device.name && (
                            <p className="text-xs text-gray-400">{device.deviceId}</p>
                          )}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.badge}`}>
                        {st.text}
                      </span>
                    </div>

                    {/* Телеметрия */}
                    {(device.batteryPercent != null || device.lux != null) && (
                      <div className="mb-3 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {device.batteryPercent != null && <span>АКБ: {device.batteryPercent}%</span>}
                        {device.lux != null && <span>· {device.lux} лк</span>}
                      </div>
                    )}

                    {/* Текущие координаты */}
                    {coords && (
                      <p className="mb-3 text-xs text-gray-400">
                        📍 {device.latitude!.toFixed(5)}, {device.longitude!.toFixed(5)}
                      </p>
                    )}

                    {/* Кнопки */}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setPlacingDeviceId((prev) =>
                            prev === device.deviceId ? null : device.deviceId,
                          )
                        }
                        disabled={saving === device.deviceId}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                          placing
                            ? 'bg-orange-500 text-white'
                            : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:opacity-90'
                        }`}>
                        {placing
                          ? 'Отмена'
                          : coords
                            ? 'Переместить'
                            : 'Разместить на карте'}
                      </button>

                      {coords && (
                        <button
                          onClick={() => handleRemoveCoords(device.deviceId)}
                          disabled={saving === device.deviceId}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                          Убрать
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
