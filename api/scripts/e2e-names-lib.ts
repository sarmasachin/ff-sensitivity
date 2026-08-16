/**
 * Shared harness for names e2e (keeps e2e-names.ts under line budget).
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
export const prisma = new PrismaClient();

export function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

export type Check = { name: string; ok: boolean; detail?: string };
export const checks: Check[] = [];

export function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

export function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

export async function req(
  method: string,
  pathName: string,
  opts?: { token?: string; body?: unknown },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

export type NamesBundle = {
  policy: {
    maxNameChars: number;
    maxBatchSize: number;
    blockSpaces: boolean;
    requireStyleWrap: boolean;
    remotePackEnabled: boolean;
    remotePackUrl: string;
  };
  frames: Array<{
    id: string;
    label: string;
    prefix: string;
    suffix: string;
    premium: boolean;
    enabled: boolean;
  }>;
  fonts: Array<{
    id: string;
    label: string;
    sample: string;
    enabled: boolean;
  }>;
};

export function goodNamesBundle(): NamesBundle {
  return {
    policy: {
      maxNameChars: 12,
      maxBatchSize: 48,
      blockSpaces: true,
      requireStyleWrap: true,
      remotePackEnabled: false,
      remotePackUrl: '',
    },
    frames: [
      {
        id: 'e2e_classic',
        label: 'E2E Classic',
        prefix: '꧁',
        suffix: '꧂',
        premium: true,
        enabled: true,
      },
    ],
    fonts: [
      { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: true },
      { id: 'wide', label: 'Wide', sample: 'ＧＨＯＳＴ', enabled: false },
    ],
  };
}
