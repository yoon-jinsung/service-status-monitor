export type Indicator = "none" | "minor" | "major" | "critical";

export interface ServiceConfig {
  name: string;
  type: "statuspage" | "custom_slack" | "aws_health";
  baseUrl?: string;
  statusUrl?: string;
  enabled: boolean;
  mentionOnCritical?: string;
}

export interface MonitorConfig {
  pollingIntervalMinutes: number;
  defaultAlertChannel: string;
  services: ServiceConfig[];
}

export interface ServiceState {
  indicator: Indicator;
  description: string;
  lastChanged: string;
  lastNotified: string;
  consecutiveFailures: number;
}

export interface StatusSnapshot {
  lastChecked: string;
  services: Record<string, ServiceState>;
}

export interface PollResult {
  indicator: Indicator;
  description: string;
}

export interface StatusChange {
  service: string;
  previous: Indicator;
  current: Indicator;
  description: string;
  serviceConfig: ServiceConfig;
}

export interface Incident {
  id: string;
  service: string;
  type: "degraded" | "recovered";
  previous: Indicator;
  current: Indicator;
  description: string;
  detectedAt: string;
}
