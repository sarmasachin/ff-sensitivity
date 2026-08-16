/**
 * Shared harness for promos e2e (keeps e2e-promos.ts under line budget).
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
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

export function windowStamps() {
  const start = new Date();
  start.setDate(start.getDate() - 2);
  const end = new Date();
  end.setDate(end.getDate() + 10);
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 3);
  const futureEnd = new Date();
  futureEnd.setDate(futureEnd.getDate() + 20);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    startsAt: fmt(start),
    endsAt: fmt(end),
    futureStartsAt: fmt(futureStart),
    futureEndsAt: fmt(futureEnd),
  };
}

export function toSaveBody(promos: any[]) {
  return {
    promos: (promos ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle ?? '',
      imageLabel: p.imageLabel,
      deepLink: p.deepLink,
      placement: p.placement,
      sortOrder: p.sortOrder,
      enabled: p.enabled,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
    })),
  };
}

export async function mintSuperToken(): Promise<string | undefined> {
  const adminEmail =
    process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminRow = await prisma.admin.findFirst({
    where: {
      email: adminEmail.trim().toLowerCase(),
      isActive: true,
    },
  });
  if (!adminRow) return undefined;
  return jwt.sign(
    { sub: adminRow.id, email: adminRow.email, role: adminRow.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
}

export async function restorePromos(token: string, promos: any[]) {
  return req('PUT', '/api/v1/admin/promos', {
    token,
    body: toSaveBody(promos),
  });
}
