'use client';

import { useState, useEffect } from 'react';
import { useLightStore } from '@/store/light-store';
import { apiClient } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import type { DeviceStatus, ScheduleSettings } from '@/lib/api/types';

type ControlMode = 'manual' | 'auto' | 'schedule';

interface Props {
  deviceId?: string | null;
}

export function LightControl({ deviceId }: Props) {
  const { settings, togglePower, setBrightness, setControlMode } = useLightStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const [controlMode, setLocalControlMode] = useState<ControlMode>('manual');

  // Расписание
  const [schedule, setSchedule] = useState<Omit<ScheduleSettings, 'deviceId'>>({
    onHour: 8,
    onMinute: 0,
    offHour: 22,
    offMinute: 0,
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // АКБ
  const [batteryStatus, setBatteryStatus] = useState<DeviceStatus | null>(null);
  const [batteryLoading, setBatteryLoading] = useState(false);

  // Загружаем статус устройства и расписание при смене deviceId
  useEffect(() => {
    if (!deviceId) return;

    apiClient
      .getDeviceStatus(deviceId)
      .then((status) => {
        setBatteryStatus(status);
        if (status.mode === 'schedule') setLocalControlMode('schedule');
        else if (status.manualMode) setLocalControlMode('manual');
        else setLocalControlMode('auto');
      })
      .catch(() => {});

    apiClient
      .getSchedule(deviceId)
      .then((s) =>
        setSchedule({ onHour: s.onHour, onMinute: s.onMinute, offHour: s.offHour, offMinute: s.offMinute }),
      )
      .catch(() => {});
  }, [deviceId]);

  const handleControlModeChange = async (mode: ControlMode) => {
    setLocalControlMode(mode);
    if (mode === 'schedule') {
      toast.success('Режим: По времени');
      return;
    }
    try {
      await setControlMode(mode);
      toast.success(mode === 'manual' ? 'Режим: Ручной' : 'Режим: Авто');
    } catch {
      toast.error('Не удалось изменить режим');
    }
  };

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
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://sunmind-backend.vercel.app'}/light/brightness`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        },
      );
    } catch {
      toast.error('Не удалось изменить яркость');
    }
  };

  const handleSaveSchedule = async () => {
    if (!deviceId) {
      toast.error('Устройство не выбрано');
      return;
    }
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

  const handleSetCharging = async (isCharging: boolean) => {
    if (!deviceId) return;
    try {
      await apiClient.setCharging(deviceId, isCharging);
      setBatteryStatus((prev) => (prev ? { ...prev, isCharging } : null));
      toast.success(isCharging ? 'Зарядка включена' : 'Зарядка отключена');
    } catch {
      toast.error('Ошибка управления зарядкой');
    }
  };

  const handleSetPowerSource = async (powerSource: 'battery' | 'ac') => {
    if (!deviceId) return;
    try {
      await apiClient.setPowerSource(deviceId, powerSource);
      setBatteryStatus((prev) => (prev ? { ...prev, powerSource } : null));
      toast.success(powerSource === 'battery' ? 'Источник: Аккумулятор' : 'Источник: Сеть (AC)');
    } catch {
      toast.error('Ошибка переключения питания');
    }
  };

  const handleSetChargeMode = async (chargeMode: 'manual' | 'auto') => {
    if (!deviceId || !batteryStatus) return;
    setBatteryLoading(true);
    try {
      await apiClient.setBatteryChargeMode(deviceId, {
        chargeMode,
        lowBatteryThreshold: batteryStatus.lowBatteryThreshold ?? 20,
        fullChargeThreshold: batteryStatus.fullChargeThreshold ?? 90,
        autoSolarCharge: batteryStatus.autoSolarCharge ?? true,
      });
      setBatteryStatus((prev) => (prev ? { ...prev, chargeMode } : null));
      toast.success(chargeMode === 'auto' ? 'Зарядка: Авто' : 'Зарядка: Ручной режим');
    } catch {
      toast.error('Ошибка настройки режима зарядки');
    } finally {
      setBatteryLoading(false);
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
      {/* Режим управления */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Режим управления
        </h3>
        <div className="flex gap-3">
          {(
            [
              { value: 'manual', label: 'Ручной' },
              { value: 'auto', label: 'Авто' },
              { value: 'schedule', label: 'По времени' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleControlModeChange(value)}
              className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                controlMode === value
                  ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Включение/выключение — только ручной режим */}
      {controlMode === 'manual' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Управление питанием
          </h3>
          <div className="flex items-center justify-center">
            <button
              onClick={handleTogglePower}
              disabled={isConfirming}
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
      )}

      {/* Яркость — ручной и расписание */}
      {(controlMode === 'manual' || controlMode === 'schedule') && (
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Яркость</h3>
          <input
            type="range"
            min="0"
            max="255"
            value={settings.brightness}
            onChange={(e) => handleBrightnessChange(Number(e.target.value))}
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
      )}

      {/* Расписание — только режим "По времени" */}
      {controlMode === 'schedule' && (
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
          {!deviceId && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Войдите в аккаунт и добавьте устройство для сохранения расписания
            </p>
          )}
        </div>
      )}

      {/* Управление аккумулятором */}
      {deviceId && (
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Аккумулятор
          </h3>

          {batteryStatus ? (
            <div className="space-y-5">
              {/* Уровень заряда */}
              {batteryStatus.batteryPercent !== undefined && (
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Уровень заряда</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {batteryStatus.batteryPercent}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        batteryStatus.batteryPercent > 50
                          ? 'bg-green-500'
                          : batteryStatus.batteryPercent > 20
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${batteryStatus.batteryPercent}%` }}
                    />
                  </div>
                  {batteryStatus.batteryVoltage !== undefined && (
                    <p className="mt-1 text-xs text-gray-500">
                      {batteryStatus.batteryVoltage.toFixed(2)} В
                    </p>
                  )}
                </div>
              )}

              {/* Источник питания */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Источник питания
                </p>
                <div className="flex gap-3">
                  {(
                    [
                      { value: 'battery', label: 'Аккумулятор' },
                      { value: 'ac', label: 'Сеть (AC)' },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleSetPowerSource(value)}
                      className={`flex-1 rounded-lg border p-2 text-sm font-medium transition-colors ${
                        batteryStatus.powerSource === value
                          ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Зарядка */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Зарядка
                  </span>
                  <p className="text-xs text-gray-500">
                    {batteryStatus.isCharging ? 'Идёт зарядка' : 'Не заряжается'}
                  </p>
                </div>
                <button
                  onClick={() => handleSetCharging(!batteryStatus.isCharging)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    batteryStatus.isCharging ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      batteryStatus.isCharging ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Режим зарядки */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Режим зарядки
                </p>
                <div className="flex gap-3">
                  {(
                    [
                      { value: 'auto', label: 'Авто' },
                      { value: 'manual', label: 'Ручной' },
                    ] as const
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleSetChargeMode(value)}
                      disabled={batteryLoading}
                      className={`flex-1 rounded-lg border p-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        batteryStatus.chargeMode === value
                          ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">Загрузка данных аккумулятора...</p>
          )}
        </div>
      )}
    </div>
  );
}
