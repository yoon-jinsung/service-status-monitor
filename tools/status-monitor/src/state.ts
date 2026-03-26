import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StatusSnapshot } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '../../state/status.json');

function defaultSnapshot(): StatusSnapshot {
  return {
    lastChecked: '',
    services: {},
  };
}

export async function loadState(): Promise<StatusSnapshot> {
  try {
    const raw = await readFile(STATE_PATH, 'utf-8');
    if (!raw.trim()) return defaultSnapshot();
    return JSON.parse(raw) as StatusSnapshot;
  } catch {
    return defaultSnapshot();
  }
}

export async function saveState(snapshot: StatusSnapshot): Promise<void> {
  await mkdir(dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');
}
