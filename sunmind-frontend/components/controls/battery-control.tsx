'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'react-hot-toast';
import type { DeviceStatus } from '@/lib/api/types';

interface Props {
  deviceId: string;
}

export function BatteryControl({ deviceId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [batteryPercent, setBatteryPercent] = useState(0);
  const [batteryVoltage, setBatteryVoltage] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [powerSource, setPowerSource] = useState<'battery' | 'ac'>('battery');
  const [chargeMode, setChargeMode] = useState<'manual' | 'auto'>('manual');

  const [lowThreshold, setLowThreshold] = useState(20);
  const [fullThreshold, setFullThreshold] = useState(90);
  const [autoSolar, setAutoSolar] = useState(true);

  const [chargingLoading, setChargingLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [modeLoading, setModeLoading] = useState(false);

  useEffect(() => {
    apiClient
      .getDeviceStatus(deviceId)
      .then((s: DeviceStatus) => {
        setBatteryPercent(Math.min(100, Math.max(0, (s.batteryPercent ?? 0) as number)));
        setBatteryVoltage((s.batteryVoltage ?? 0) as number);
        setIsCharging(s.isCharging ?? false);
        if (s.powerSource === 'ac' || s.powerSource === 'battery') setPowerSource(s.powerSource);
        if (s.chargeMode === 'auto' || s.chargeMode === 'manual') setChargeMode(s.chargeMode);
        setLowThreshold(s.lowBatteryThreshold ?? 20);
        setFullThreshold(s.fullChargeThreshold ?? 90);
        setAutoSolar(s.autoSolarCharge ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deviceId]);

  const batteryColor =
    batteryPercent <= 20 ? '#E55454' : batteryPercent <= 50 ? '#FF9F43' : '#39B86D';

  const batteryLabel =
    batteryPercent <= 20
      ? 'Низкий заряд'
      : batteryPercent <= 50
        ? 'Средний заряд'
        : batteryPercent >= 90
          ? 'Полный заряд'
          : 'Нормальный заряд';

  const handleSetMode = async (mode: 'manual' | 'auto') => {
    const prev = chargeMode;
    setModeLoading(true);
    setChargeMode(mode);
    try {
      await apiClient.setBatteryChargeMode(deviceId, {
        chargeMode: mode,
        lowBatteryThreshold: lowThreshold,
        fullChargeThreshold: fullThreshold,
        autoSolarCharge: autoSolar,
      });
    } catch {
      setChargeMode(prev);
      toast.error('Ошибка смены режима');
    } finally {
      setModeLoading(false);
    }
  };

  const handleSetCharging = async (value: boolean) => {
    const prev = isCharging;
    setChargingLoading(true);
    setIsCharging(value);
    try {
      await apiClient.setCharging(deviceId, value);
    } catch {
      setIsCharging(prev);
      toast.error('Ошибка управления зарядкой');
    } finally {
      setChargingLoading(false);
    }
  };

  const handleSetPowerSource = async (source: 'battery' | 'ac') => {
    const prev = powerSource;
    setSourceLoading(true);
    setPowerSource(source);
    try {
      await apiClient.setPowerSource(deviceId, source);
    } catch {
      setPowerSource(prev);
      toast.error('Ошибка переключения питания');
    } finally {
      setSourceLoading(false);
    }
  };

  const handleSaveAutoSettings = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await apiClient.setBatteryChargeMode(deviceId, {
        chargeMode,
        lowBatteryThreshold: lowThreshold,
        fullChargeThreshold: fullThreshold,
        autoSolarCharge: autoSolar,
      });
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div
        className="rounded-3xl border bg-white p-6 dark:bg-[#171A1F]"
        style={{ borderColor: `${batteryColor}4D` }}>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[18px]"
            style={{ backgroundColor: `${batteryColor}24` }}>
            <BatteryIcon percent={batteryPercent} isCharging={isCharging} color={batteryColor} />
          </div>
          <div className="flex-1">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-extrabold leading-none" style={{ color: batteryColor }}>
                {batteryPercent}%
              </span>
              {batteryVoltage > 0 && (
                <span className="mb-1 text-sm font-semibold text-gray-400">
                  {batteryVoltage.toFixed(1)} V
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusChip
                label={isCharging ? 'Зарядка' : 'Разряд'}
                color={isCharging ? '#39B86D' : '#6D7481'}
                icon={isCharging ? '⚡' : '🔋'}
              />
              <StatusChip
                label={powerSource === 'ac' ? 'Розетка' : 'АКБ'}
                color={powerSource === 'ac' ? '#5E9EFF' : batteryColor}
                icon={powerSource === 'ac' ? '🔌' : '🔋'}
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${batteryColor}1F` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${batteryPercent}%`, backgroundColor: batteryColor }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-gray-400">0%</span>
            <span className="font-semibold" style={{ color: batteryColor }}>{batteryLabel}</span>
            <span className="text-gray-400">100%</span>
          </div>
        </div>
      </div>

      {/* Mode selector */}
      <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Режим зарядки
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'manual', label: 'Ручной', hint: 'Полный контроль', icon: '🎛️' },
            { value: 'auto', label: 'Авто', hint: 'Умное управление', icon: '🔄' },
          ] as const).map(({ value, label, hint, icon }) => {
            const selected = chargeMode === value;
            return (
              <button
                key={value}
                onClick={() => !modeLoading && handleSetMode(value)}
                className="flex flex-col items-center gap-1 rounded-2xl border py-5 transition-all duration-200"
                style={
                  selected
                    ? {
                        background: 'linear-gradient(135deg, #FFD54F, #FF9F43, #FF6B35)',
                        borderColor: 'transparent',
                        color: '#1A0F00',
                      }
                    : {
                        background: 'transparent',
                        borderColor: '#D0D5E0',
                        color: '#6D7481',
                      }
                }>
                {modeLoading && chargeMode === value ? (
                  <div
                    className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: selected ? '#1A0F00' : '#6D7481' }}
                  />
                ) : (
                  <span className="text-3xl">{icon}</span>
                )}
                <span className="text-sm font-bold">{label}</span>
                <span className="text-xs opacity-60">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual mode: power source + charging toggle */}
      {chargeMode === 'manual' && (
        <>
          {/* Power source */}
          <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
              Источник питания
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => !sourceLoading && handleSetPowerSource('battery')}
                className="flex flex-col items-center gap-2 rounded-2xl border py-5 transition-all duration-200"
                style={
                  powerSource === 'battery'
                    ? { background: 'linear-gradient(135deg, #2fa85a, #39B86D)', borderColor: 'transparent', color: '#fff' }
                    : { background: 'transparent', borderColor: '#ffffff30', color: '#39B86D' }
                }>
                {sourceLoading && powerSource === 'battery' ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span className="text-3xl">🔋</span>
                )}
                <span className="text-sm font-bold">АКБ</span>
                {batteryPercent > 0 && (
                  <span className="text-xs opacity-70">{batteryPercent}%</span>
                )}
              </button>
              <button
                onClick={() => !sourceLoading && handleSetPowerSource('ac')}
                className="flex flex-col items-center gap-2 rounded-2xl border py-5 transition-all duration-200"
                style={
                  powerSource === 'ac'
                    ? { background: 'linear-gradient(135deg, #4a85e8, #5E9EFF)', borderColor: 'transparent', color: '#fff' }
                    : { background: 'transparent', borderColor: '#ffffff30', color: '#5E9EFF' }
                }>
                {sourceLoading && powerSource === 'ac' ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span className="text-3xl">🔌</span>
                )}
                <span className="text-sm font-bold">Розетка</span>
                <span className="text-xs opacity-70">220В</span>
              </button>
            </div>
          </div>

          {/* Charging toggle */}
          <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: isCharging ? '#39B86D24' : '#E5545424' }}>
                <span className="text-2xl">{isCharging ? '⚡' : '🔋'}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Зарядка</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                  {isCharging ? 'Идёт зарядка' : batteryPercent >= 90 ? 'Батарея полная' : 'Зарядка отключена'}
                </p>
              </div>
              {chargingLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              ) : (
                <button
                  onClick={() => batteryPercent < 90 && handleSetCharging(!isCharging)}
                  disabled={batteryPercent >= 90}
                  className="relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-40"
                  style={{ backgroundColor: isCharging ? '#39B86D' : '#D1D5DB', width: '52px' }}>
                  <span
                    className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    style={{ transform: isCharging ? 'translateX(24px)' : 'translateX(0)' }}
                  />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Auto mode settings */}
      {chargeMode === 'auto' && (
        <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
            Настройки авто-режима
          </p>

          {/* Auto solar */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px] bg-orange-400/15">
              <span className="text-xl">☀️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Авто-зарядка от солнца</p>
              <p className="text-xs text-gray-400">Включать зарядку при наличии солнечной энергии</p>
            </div>
            <button
              onClick={() => setAutoSolar(!autoSolar)}
              className="relative inline-flex h-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
              style={{ backgroundColor: autoSolar ? '#FF9F43' : '#D1D5DB', width: '52px' }}>
              <span
                className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ease-in-out"
                style={{ transform: autoSolar ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </button>
          </div>

          <div className="my-5 border-t border-gray-100 dark:border-white/10" />

          {/* Low threshold */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🪫</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Порог разряда</span>
              </div>
              <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-500 dark:bg-red-500/15">
                {lowThreshold}%
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">Переключиться на сеть при заряде ниже</p>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={lowThreshold}
              onChange={(e) => setLowThreshold(Number(e.target.value))}
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background: `linear-gradient(to right, #E55454 0%, #E55454 ${((lowThreshold - 5) / 45) * 100}%, #E5545430 ${((lowThreshold - 5) / 45) * 100}%, #E5545430 100%)`,
              }}
            />
          </div>

          <div className="my-5 border-t border-gray-100 dark:border-white/10" />

          {/* Full threshold */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔋</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Порог полного заряда</span>
              </div>
              <span className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-bold text-green-600 dark:bg-green-500/15 dark:text-green-400">
                {fullThreshold}%
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">Остановить зарядку при достижении</p>
            <input
              type="range"
              min={60}
              max={100}
              step={5}
              value={fullThreshold}
              onChange={(e) => setFullThreshold(Number(e.target.value))}
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background: `linear-gradient(to right, #39B86D 0%, #39B86D ${((fullThreshold - 60) / 40) * 100}%, #39B86D30 ${((fullThreshold - 60) / 40) * 100}%, #39B86D30 100%)`,
              }}
            />
          </div>

          <div className="my-5 border-t border-gray-100 dark:border-white/10" />

          {/* Info */}
          <div className="rounded-xl border border-orange-300/30 bg-orange-400/8 p-3">
            <div className="flex gap-2">
              <span className="mt-0.5 text-sm">ℹ️</span>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                В авто-режиме система автоматически управляет зарядкой на основе заданных порогов и доступности солнечной энергии.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save button for auto mode */}
      {chargeMode === 'auto' && (
        <button
          onClick={handleSaveAutoSettings}
          disabled={saving}
          className="w-full rounded-2xl py-4 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #FFD54F, #FF9F43, #FF6B35)', color: '#1A0F00' }}>
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1A0F00] border-t-transparent" />
              Сохранение...
            </span>
          ) : (
            'Сохранить настройки'
          )}
        </button>
      )}
    </div>
  );
}

function BatteryIcon({ percent, isCharging, color }: { percent: number; isCharging: boolean; color: string }) {
  const emoji = isCharging ? '⚡' : percent <= 20 ? '🪫' : percent <= 50 ? '🔋' : '🔋';
  return <span className="text-3xl">{emoji}</span>;
}

function StatusChip({ label, color, icon }: { label: string; color: string; icon: string }) {
  return (
    <span
      className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}1F`, borderColor: `${color}4D` }}>
      {icon} {label}
    </span>
  );
}
