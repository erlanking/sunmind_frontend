'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { LightControl } from '@/components/controls/light-control';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import type { DeviceStatus } from '@/lib/api/types';

export default function ControlPage() {
  const { isAuthenticated } = useAuthStore();
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setDeviceId('SMP-0002');
      return;
    }
    apiClient
      .getDevices()
      .then((list) => {
        setDevices(list);
        if (list.length > 0) setDeviceId(list[0].deviceId);
      })
      .catch(() => setDeviceId('SMP-0002'));
  }, [isAuthenticated]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Управление светильником
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Управляйте настройками вашего интеллектуального светильника SunMind
            </p>

            {devices.length > 1 && (
              <div className="mt-4">
                <select
                  value={deviceId || ''}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.name || d.deviceId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {deviceId && (
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    devices.find((d) => d.deviceId === deviceId)?.connected
                      ? 'bg-green-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {devices.find((d) => d.deviceId === deviceId)?.connected
                    ? 'Устройство онлайн'
                    : 'Устройство оффлайн'}
                </span>
              </div>
            )}
          </div>

          <div className="mx-auto max-w-4xl">
            <LightControl deviceId={deviceId} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
