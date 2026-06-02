import type { Review, NewReview } from '@/types';
import { API_CONFIG, getAuthToken } from './config';
import type { DeviceStatus, ScheduleSettings } from './types';

class ApiClient {
  private baseUrl = API_CONFIG.baseUrl;

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (options?.headers) {
      Object.assign(headers, options.headers);
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async getReviews(): Promise<Review[]> {
    return this.request<Review[]>('/api/reviews');
  }

  async addReview(review: NewReview): Promise<Review> {
    return this.request<Review>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  async getDevices(): Promise<DeviceStatus[]> {
    return this.request<DeviceStatus[]>('/api/devices');
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    return this.request<DeviceStatus>(`/api/devices/${deviceId}/status`);
  }

  async controlDevice(deviceId: string, isOn: boolean): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify({ command: isOn ? 'turn_on' : 'turn_off' }),
    });
  }

  async turnOn(): Promise<unknown> {
    return this.request('/api/devices/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'turn_on' }),
    });
  }

  async turnOff(): Promise<unknown> {
    return this.request('/api/devices/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'turn_off' }),
    });
  }

  async setDeviceBrightness(deviceId: string, brightness: number): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify({ command: 'set_brightness', value: brightness }),
    });
  }

  async setDeviceMode(deviceId: string, mode: string): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify({ command: 'set_mode', value: mode }),
    });
  }

  async setControlMode(mode: string): Promise<unknown> {
    return this.request('/api/devices/control', {
      method: 'POST',
      body: JSON.stringify({ command: 'set_mode', value: mode }),
    });
  }

  async getSchedule(deviceId: string): Promise<ScheduleSettings> {
    return this.request<ScheduleSettings>(`/api/devices/${deviceId}/schedule`);
  }

  async setSchedule(deviceId: string, schedule: Omit<ScheduleSettings, 'deviceId'>): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async setCharging(deviceId: string, isCharging: boolean): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/battery`, {
      method: 'POST',
      body: JSON.stringify({ isCharging }),
    });
  }

  async setPowerSource(deviceId: string, powerSource: 'battery' | 'ac'): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/battery`, {
      method: 'POST',
      body: JSON.stringify({ powerSource }),
    });
  }

  async setBatteryChargeMode(
    deviceId: string,
    settings: {
      chargeMode: 'manual' | 'auto';
      lowBatteryThreshold: number;
      fullChargeThreshold: number;
      autoSolarCharge: boolean;
    },
  ): Promise<unknown> {
    return this.request(`/api/devices/${deviceId}/battery`, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }
}

export const apiClient = new ApiClient();
