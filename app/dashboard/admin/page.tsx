'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'react-hot-toast';
import type { DeviceStatus } from '@/lib/api/types';

export default function AdminPage() {
  const { isAuthenticated } = useAuthStore();
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient.getDevices().then(setDevices).catch(() => {});
  }, [isAuthenticated]);

  const handleRemoveCoords = async (deviceId: string) => {
    setSaving(deviceId);
    try {
      await apiClient.updateDevice(deviceId, { latitude: null, longitude: null });
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === deviceId ? { ...d, latitude: null, longitude: null } : d)),
      );
      toast.success('Метка удалена');
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Панели</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Управление устройствами
            </p>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
              <p className="text-gray-500">Нет зарегистрированных устройств</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => {
                const st = statusInfo(device);
                return (
                  <div
                    key={device.deviceId}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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

                    <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
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

                    {device.latitude != null && device.longitude != null && (
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                        <p className="text-xs text-gray-400">
                          📍 {device.latitude.toFixed(5)}, {device.longitude.toFixed(5)}
                        </p>
                        <button
                          onClick={() => handleRemoveCoords(device.deviceId)}
                          disabled={saving === device.deviceId}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50">
                          Убрать
                        </button>
                      </div>
                    )}
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
