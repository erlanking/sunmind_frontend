export interface DeviceStatus {
  deviceId: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  online?: boolean;
  batteryPercent?: number | null;
  brightness?: number | null;
  lux?: number | null;
}

export interface Device {
  id: string;
  name: string;
  api_key: string;
  user_id: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface DeviceTelemetry {
  temperature?: number;
  humidity?: number;
  battery?: number;
  brightness?: number;
  lux?: number;
  motion?: boolean;
  timestamp: string;
}

export type WebSocketMessage =
  | TelemetryMessage
  | DeviceConnectionMessage
  | CommandAckMessage
  | ErrorMessage
  | SendCommandMessage;

export interface TelemetryMessage {
  type: 'telemetry';
  device_id: string;
  data: DeviceTelemetry & { timestamp?: string };
}

export interface DeviceConnectionMessage {
  type: 'device_connection';
  device_id: string;
  connected: boolean;
  device_name: string;
}

export interface CommandAckMessage {
  type: 'command_ack';
  device_id: string;
  command: string;
  success: boolean;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface SendCommandMessage {
  type: 'command';
  device_id: string;
  command: string;
  value?: number | string | boolean;
}
