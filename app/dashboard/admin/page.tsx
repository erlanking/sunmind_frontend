'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';
import type { DeviceStatus } from '@/lib/api/types';

// Карта только на клиенте (Leaflet не работает в SSR)
const DevicesMap = dynamic(
  () => import('@/components/map/devices-map').then((m) => ({ default: m.DevicesMap })),
  { ssr: false, loading: () => <div className="flex h-[420px] items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500">Загрузка карты...</div> },
);

type CoordsState = Record<string, { lat: string; lng: string }>;

export default function AdminPage() {
  const { isAuthenticated } = useAuthStore();
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [coords, setCoords] = useState<CoordsState>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient
      .getDevices()
      .then((list) => {
        setDevices(list);
        const initial: CoordsState = {};
        list.forEach((d) => {
          initial[d.deviceId] = {
            lat: d.latitude != null ? String(d.latitude) : '',
            lng: d.longitude != null ? String(d.longitude) : '',
          };
        });
        setCoords(initial);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const handleSave = async (deviceId: string) => {
    const c = coords[deviceId];
    const lat = parseFloat(c?.lat ?? '');
    const lng = parseFloat(c?.lng ?? '');
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Введите корректные координаты');
      return;
    }
    setSaving(deviceId);
    try {
      await apiClient.updateDevice(deviceId, { latitude: lat, longitude: lng });
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === deviceId ? { ...d, latitude: lat, longitude: lng } : d)),
      );
      toast.success('Координаты сохранены');
    } catch {
      toast.error('Не удалось сохранить координаты');
    } finally {
      setSaving(null);
    }
  };

  const statusLabel = (d: DeviceStatus) => {
    if (!d.connected) return { text: 'Оффлайн', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
    if (d.batteryPercent != null && d.batteryPercent < 20)
      return { text: 'Низкий заряд', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { text: 'Онлайн', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Карта панелей</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Отслеживайте местоположение и статус устройств в реальном времени
            </p>
          </div>

          {/* Легенда */}
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            {[
              { color: 'bg-green-500', label: 'Онлайн' },
              { color: 'bg-yellow-500', label: 'Низкий заряд' },
              { color: 'bg-gray-400', label: 'Оффлайн' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full ${color}`} />
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Карта */}
          <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
            <DevicesMap devices={devices} onDeviceClick={setSelectedId} />
          </div>

          {/* Список устройств */}
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Устройства ({devices.length})
          </h2>

          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400">Устройства не найдены</p>
              <p className="mt-1 text-sm text-gray-400">Зарегистрируйте панель, чтобы она появилась здесь</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => {
                const status = statusLabel(device);
                const isSelected = selectedId === device.deviceId;

                return (
                  <div
                    key={device.deviceId}
                    className={`rounded-xl border bg-white p-5 shadow-sm transition-all dark:bg-gray-800 ${
                      isSelected
                        ? 'border-orange-500 ring-2 ring-orange-500/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    {/* Заголовок карточки */}
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {device.name || device.deviceId}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {device.deviceId}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>
                        {status.text}
                      </span>
                    </div>

                    {/* Телеметрия */}
                    <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                      {device.batteryPercent != null && (
                        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">АКБ</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{device.batteryPercent}%</p>
                        </div>
                      )}
                      {device.lux != null && (
                        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Свет</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{device.lux} лк</p>
                        </div>
                      )}
                    </div>

                    {/* Координаты */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Координаты
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Широта"
                          value={coords[device.deviceId]?.lat ?? ''}
                          onChange={(e) =>
                            setCoords((prev) => ({
                              ...prev,
                              [device.deviceId]: {
                                ...prev[device.deviceId],
                                lat: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Долгота"
                          value={coords[device.deviceId]?.lng ?? ''}
                          onChange={(e) =>
                            setCoords((prev) => ({
                              ...prev,
                              [device.deviceId]: {
                                ...prev[device.deviceId],
                                lng: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => handleSave(device.deviceId)}
                        disabled={saving === device.deviceId}
                        className="w-full rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                        {saving === device.deviceId ? 'Сохранение...' : 'Сохранить на карте'}
                      </button>

                      {device.latitude != null && device.longitude != null && (
                        <p className="text-center text-xs text-gray-400">
                          {device.latitude.toFixed(5)}, {device.longitude.toFixed(5)}
                        </p>
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
