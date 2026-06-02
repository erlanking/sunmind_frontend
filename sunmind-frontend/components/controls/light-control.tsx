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

const ORANGE_GRADIENT = 'linear-gradient(135deg, #FFD54F, #FF9F43, #FF6B35)';

const MODES: { value: LightMode; label: string; hint: string; icon: string; brightness: number }[] = [
  { value: 'economy',  label: 'Эконом',    hint: '25%',  icon: '🌙', brightness: 64 },
  { value: 'default',  label: 'Стандарт',  hint: '50%',  icon: '☀️', brightness: 128 },
  { value: 'maximum',  label: 'Максимум',  hint: '100%', icon: '🔆', brightness: 255 },
  { value: 'custom',   label: 'Свой',      hint: '—',    icon: '🎚️', brightness: 128 },
];

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
    apiClient
      .getSchedule(deviceId)
      .then((s) => setSchedule({ onHour: s.onHour, onMinute: s.onMinute, offHour: s.offHour, offMinute: s.offMinute }))
      .catch(() => {});
  }, [deviceId]);

  const handleTogglePower = () => {
    if (settings.isOn) {
      setIsConfirming(true);
      setTimeout(() => { togglePower(); toast.success('Светильник выключен'); setIsConfirming(false); }, 500);
    } else {
      togglePower();
      toast.success('Светильник включен');
    }
  };

  const handleBrightnessChange = async (value: number) => {
    setBrightness(value);
    if (!deviceId) return;
    try { await apiClient.setDeviceBrightness(deviceId, value); }
    catch { toast.error('Не удалось изменить яркость'); }
  };

  const handleModeChange = async (mode: LightMode) => {
    const m = MODES.find((x) => x.value === mode)!;
    setMode(mode);
    setBrightness(m.brightness);
    toast.success(`Режим: ${m.label}`);
    if (!deviceId) return;
    try { await apiClient.setDeviceBrightness(deviceId, m.brightness); }
    catch { toast.error('Не удалось синхронизировать режим'); }
  };

  const handleControlModeChange = (mode: 'manual' | 'auto') => {
    setControlMode(mode);
    toast.success(mode === 'manual' ? 'Ручной режим' : 'Автоматический режим');
  };

  const handleSaveSchedule = async () => {
    if (!deviceId) { toast.error('Устройство не выбрано'); return; }
    setScheduleLoading(true);
    try { await apiClient.setSchedule(deviceId, schedule); toast.success('Расписание сохранено'); }
    catch { toast.error('Не удалось сохранить расписание'); }
    finally { setScheduleLoading(false); }
  };

  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const parseTime = (v: string) => {
    const [h, m] = v.split(':').map(Number);
    return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
  };

  const brightnessPercent = Math.round((settings.brightness / 255) * 100);

  return (
    <div className="space-y-4">

      {/* ── Питание ── */}
      <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
          Питание
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleTogglePower}
            disabled={isConfirming || settings.controlMode === 'auto'}
            className={`relative flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 disabled:opacity-60 ${isConfirming ? 'animate-pulse' : ''}`}
            style={
              settings.isOn
                ? { background: ORANGE_GRADIENT, boxShadow: '0 8px 32px #FF9F4366' }
                : { background: '#E5E7EB' }
            }>
            <svg
              className={`h-14 w-14 transition-colors ${settings.isOn ? 'text-[#1A0F00]' : 'text-gray-400'}`}
              fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              viewBox="0 0 24 24" stroke="currentColor">
              {settings.isOn
                ? <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                : <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />}
            </svg>
            {settings.isOn && (
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-40" />
            )}
          </button>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {settings.isOn ? 'Светильник включён' : 'Светильник выключен'}
          </p>
        </div>
      </div>

      {/* ── Режим управления ── */}
      <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Режим управления
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'manual', label: 'Ручной',       hint: 'Вы управляете',    icon: '🎛️' },
            { value: 'auto',   label: 'Автоматический', hint: 'Датчик движения', icon: '🤖' },
          ] as const).map(({ value, label, hint, icon }) => {
            const sel = settings.controlMode === value;
            return (
              <button
                key={value}
                onClick={() => handleControlModeChange(value)}
                className="flex flex-col items-center gap-1 rounded-2xl border py-5 transition-all duration-200"
                style={sel
                  ? { background: ORANGE_GRADIENT, borderColor: 'transparent', color: '#1A0F00' }
                  : { background: 'transparent', borderColor: '#D0D5E0', color: '#6D7481' }}>
                <span className="text-3xl">{icon}</span>
                <span className="text-sm font-bold">{label}</span>
                <span className="text-xs opacity-60">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Яркость ── */}
      <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Яркость</p>
          <span className="rounded-lg px-2.5 py-1 text-sm font-bold"
            style={{ background: '#FF9F4320', color: '#FF9F43' }}>
            {brightnessPercent}%
          </span>
        </div>
        <input
          type="range" min="0" max="255"
          value={settings.brightness}
          disabled={settings.controlMode === 'auto'}
          onChange={(e) => handleBrightnessChange(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:opacity-40"
          style={{
            background: `linear-gradient(to right, #FF9F43 0%, #FF9F43 ${brightnessPercent}%, #E5E7EB ${brightnessPercent}%, #E5E7EB 100%)`,
          }}
        />
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── Режимы работы ── */}
      <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Режимы работы
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MODES.map(({ value, label, hint, icon }) => {
            const sel = settings.mode === value;
            return (
              <button
                key={value}
                onClick={() => handleModeChange(value)}
                className="flex flex-col items-center gap-1 rounded-2xl border py-4 transition-all duration-200"
                style={sel
                  ? { background: ORANGE_GRADIENT, borderColor: 'transparent', color: '#1A0F00' }
                  : { background: 'transparent', borderColor: '#D0D5E0', color: '#6D7481' }}>
                <span className="text-2xl">{icon}</span>
                <span className="text-sm font-bold">{label}</span>
                <span className="text-xs opacity-60">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Расписание ── */}
      <div className="rounded-3xl bg-white p-5 dark:bg-[#171A1F]">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Расписание
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Включить в
            </label>
            <input
              type="time"
              value={fmt(schedule.onHour, schedule.onMinute)}
              onChange={(e) => { const { h, m } = parseTime(e.target.value); setSchedule((p) => ({ ...p, onHour: h, onMinute: m })); }}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Выключить в
            </label>
            <input
              type="time"
              value={fmt(schedule.offHour, schedule.offMinute)}
              onChange={(e) => { const { h, m } = parseTime(e.target.value); setSchedule((p) => ({ ...p, offHour: h, offMinute: m })); }}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={scheduleLoading || !deviceId}
          className="mt-4 w-full rounded-2xl py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: ORANGE_GRADIENT, color: '#1A0F00' }}>
          {scheduleLoading ? 'Сохранение...' : 'Сохранить расписание'}
        </button>
      </div>

      {/* ── Аккумулятор ── */}
      {deviceId && (
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Аккумулятор
          </p>
          <BatteryControl deviceId={deviceId} />
        </div>
      )}

      {/* ── Сброс ── */}
      <button
        onClick={() => { resetToDefault(); toast.success('Настройки сброшены'); }}
        className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20">
        Сбросить настройки
      </button>

    </div>
  );
}
