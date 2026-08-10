/**
 * Live FCM smoke test — does NOT print device tokens.
 * 1) Firebase Admin send to topic `all_users`
 * 2) Optional: admin login + create/send campaign via Nest (if API up)
 *
 * Run: cd api && npx ts-node --transpile-only scripts/live-push-smoke.ts
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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

async function req(
  method: string,
  pathName: string,
  opts?: { token?: string; body?: unknown },
) {
  const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
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
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  const credPath = path.isAbsolute(process.env.FIREBASE_ADMIN_PATH || '')
    ? (process.env.FIREBASE_ADMIN_PATH as string)
    : path.join(
        __dirname,
        '..',
        process.env.FIREBASE_ADMIN_PATH || 'secrets/firebase-admin.json',
      );

  if (!fs.existsSync(credPath)) {
    console.log('FAIL firebase_admin_missing');
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const projectId = json.project_id || json.projectId;
  console.log(`PASS firebase_admin_loaded project=${projectId}`);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(json),
      projectId,
    });
  }

  const stamp = new Date().toISOString().slice(11, 19);
  const title = `Live Test ${stamp}`;
  const body = 'FF Sensi Pro live push smoke — open Challenge';
  const deepLink = 'ffops://challenge';

  try {
    const id = await admin.messaging().send({
      topic: 'all_users',
      notification: { title, body },
      data: { title, body, deepLink },
      android: {
        priority: 'high',
        notification: { channelId: 'ff_ops_push' },
      },
    });
    console.log(`PASS fcm_topic_all_users messageId=${id.slice(0, 24)}…`);
  } catch (e: any) {
    console.log(
      `FAIL fcm_topic_all_users code=${e?.code || 'ERR'} msg=${e?.message || e}`,
    );
  }

  // Nest admin campaign path (cookie session — login no longer returns JWT body)
  try {
    const ping = await req('GET', '/api/v1/app/config');
    if (ping.status !== 200) {
      console.log(`SKIP nest_campaign api_status=${ping.status}`);
      return;
    }
    console.log('PASS nest_api_up');
    console.log(
      'INFO nest_admin_send — use scripts/live-push-admin-probe.ts (cookie login)',
    );
  } catch (e: any) {
    console.log(`SKIP nest_campaign err=${e?.message || e}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
