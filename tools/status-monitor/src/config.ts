import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { MonitorConfig, ServiceConfig } from './types';

const CONFIG_PATH = resolve(__dirname, '../../config/services.json');

export async function loadConfig(): Promise<MonitorConfig> {
  const raw = await readFile(CONFIG_PATH, 'utf-8');
  const config: MonitorConfig = JSON.parse(raw);
  return config;
}

export function getEnabledServices(config: MonitorConfig): ServiceConfig[] {
  return config.services.filter((s) => s.enabled);
}
