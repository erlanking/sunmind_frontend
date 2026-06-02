'use client';

import { useState, useEffect } from 'react';
import { useLightStore } from '@/store/light-store';
import { apiClient } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import type { LightMode } from '@/types';
import type { ScheduleSettings } from '@/lib/api/types';
import { BatteryControl } from './battery-control';

interface Props {
  deviceId?: string | null;
}

export function LightControl({ deviceId }: Props) {
  const { settings, togglePower, setBrightness, setMode, setControlMode, resetToDefault } =
    useLightStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [schedule, setSchedule] = useState<Omit<ScheduleSettings, 'deviceId'>>({
    onHour: 8, onMinute: 0, offHour: 22, offMinute: 0,
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    apiClient.getSchedule(deviceId)
      .then((s) => setSchedule({ onHour: s.onHour, onMinute: s.onMinute, offHour: s.offHour, offMinute: s.offMinute }))
      .catch(() => {});
  }, [deviceId]);

  const handleTogglePower = () => {
    if (settings.isOn) {
      setIsConfirming(true);
      setTimeout(() => {
        togglePower();
        toast.success('Светильник выключен');
        setIsConfirming(false);
      }, 500);
    } else {
      togglePower();
      toast.success('Светильник включен');
    }
  };

  const handleBrightnessChange = async (value: number) => {
    setBrightness(value);
    if (!deviceId) return;
    try {
      await apiClient.setDeviceBrightness(deviceId, value);
      toast.success(`Яркость: ${Math.round((value / 255) * 100)}%`);
    } catch {
      toast.error('Не удалось изменить яркость');
    }
  };

  const MODE_BRIGHTNESS: Record<LightMode, number> = {
    economy: 64,
    maximum: 255,
    default: 128,
    custom: 128,
  };

  const handleModeChange = async (mode: LightMode) => {
    setMode(mode);
    const newBrightness = MODE_BRIGHTNESS[mode];
    setBrightness(newBrightness);
    toast.success(`Режим: ${getModeLabel(mode)}`);
    if (!deviceId) return;
    try {
      await apiClient.setDeviceBrightness(deviceId, newBrightness);
    } catch {
      toast.error('Не удалось синхронизировать режим');
    }
  };

  const handleReset = () => {
    resetToDefault();
    toast.success('Настройки сброшены');
  };

  const getModeLabel = (mode: LightMode): string => ({
    economy: 'Эконом',
    maximum: 'Максимум',
    default: 'По умолчанию',
    custom: 'Пользовательский',
  })[mode];

  const handleControlModeChange = (mode: 'manual' | 'auto') => {
    setControlMode(mode);
    toast.success(`Режим: ${mode === 'manual' ? 'Ручной' : 'Автоматический'}`);
  };

  const handleSaveSchedule = async () => {
    if (!deviceId) { toast.error('Устройство не выбрано'); return; }
    setScheduleLoading(true);
    try {
      await apiClient.setSchedule(deviceId, schedule);
      toast.success('Расписание сохранено');
    } catch {
      toast.error('Не удалось сохранить расписание');
    } finally {
      setScheduleLoading(false);
    }
  };

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const parseTime = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
  };

  return (
    <div className="space-y-6">
      {/* Включение/выключение */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Управление питанием
        </h3>
        <div className="flex items-center justify-center">
          <button
            onClick={handleTogglePower}
            disabled={isConfirming || settings.controlMode === 'auto'}
            className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 ${
              settings.isOn
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/50'
                : 'bg-gray-300 dark:bg-gray-700'
            } ${isConfirming ? 'animate-pulse' : ''}`}>
            <svg
              className={`h-16 w-16 transition-colors ${settings.isOn ? 'text-white' : 'text-gray-500'}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor">
              {settings.isOn ? (
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              ) : (
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              )}
            </svg>
            {settings.isOn && (
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-75" />
            )}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {settings.isOn ? 'Светильник включен' : 'Светильник выключен'}
        </p>
      </div>

      {/* Режим управления */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Режим управления
        </h3>
        <div className="flex gap-4">
          {(['manual', 'auto'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleControlModeChange(mode)}
              className={`flex-1 rounded-lg border p-3 text-center font-medium transition-colors ${
                settings.controlMode === mode
                  ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
              }`}>
              {mode === 'manual' ? 'Ручной' : 'Автоматический'}
            </button>
          ))}
        </div>
      </div>

      {/* Яркость */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Яркость</h3>
        <input
          type="range"
          min="0"
          max="255"
          value={settings.brightness}
          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
          disabled={settings.controlMode === 'auto'}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg"
          style={{
            background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${Math.round((settings.brightness / 255) * 100)}%, #e5e7eb ${Math.round((settings.brightness / 255) * 100)}%, #e5e7eb 100%)`,
          }}
        />
        <div className="mt-2 flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">0%</span>
          <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            {Math.round((settings.brightness / 255) * 100)}%
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">100%</span>
        </div>
      </div>

      {/* Режимы работы */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Режимы работы</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(['economy', 'maximum', 'default', 'custom'] as LightMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                settings.mode === mode
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
              }`}>
              <div
                className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${
                  settings.mode === mode
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                <svg
                  className={`h-6 w-6 ${settings.mode === mode ? 'text-white' : 'text-gray-500'}`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span
                className={`text-sm font-medium ${
                  settings.mode === mode
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                {getModeLabel(mode)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Расписание */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Расписание</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Включить в
            </label>
            <input
              type="time"
              value={formatTime(schedule.onHour, schedule.onMinute)}
              onChange={(e) => {
                const { h, m } = parseTime(e.target.value);
                setSchedule((prev) => ({ ...prev, onHour: h, onMinute: m }));
              }}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Выключить в
            </label>
            <input
              type="time"
              value={formatTime(schedule.offHour, schedule.offMinute)}
              onChange={(e) => {
                const { h, m } = parseTime(e.target.value);
                setSchedule((prev) => ({ ...prev, offHour: h, offMinute: m }));
              }}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={scheduleLoading || !deviceId}
          className="mt-4 w-full rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {scheduleLoading ? 'Сохранение...' : 'Сохранить расписание'}
        </button>
      </div>

      {/* Аккумулятор */}
      {deviceId && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Аккумулятор</h3>
          <BatteryControl deviceId={deviceId} />
        </div>
      )}

      {/* Сброс настроек */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Дополнительные действия
        </h3>
        <button
          onClick={handleReset}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
          Сбросить настройки по умолчанию
        </button>
      </div>
    </div>
  );
}
