import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Incident, StatusChange } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INCIDENTS_PATH = resolve(__dirname, "../../../logs/incidents.json");

function toIncident(change: StatusChange): Incident {
  const now = new Date();
  const detectedAt = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  return {
    id: crypto.randomUUID(),
    service: change.service,
    type: change.current === "none" ? "recovered" : "degraded",
    previous: change.previous,
    current: change.current,
    description: change.description,
    detectedAt,
  };
}

async function loadExistingIncidents(): Promise<Incident[]> {
  try {
    const raw = await readFile(INCIDENTS_PATH, "utf-8");
    return JSON.parse(raw) as Incident[];
  } catch {
    return [];
  }
}

export async function logIncidents(changes: StatusChange[]): Promise<void> {
  if (changes.length === 0) return;

  const existing = await loadExistingIncidents();
  const newIncidents = changes.map(toIncident);
  const merged = [...existing, ...newIncidents];

  await mkdir(dirname(INCIDENTS_PATH), { recursive: true });
  await writeFile(INCIDENTS_PATH, JSON.stringify(merged, null, 2), "utf-8");
}
