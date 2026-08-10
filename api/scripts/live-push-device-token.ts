/**
 * Send FCM to this emulator's registration token (no token printed).
 * Run: cd api && npx ts-node --transpile-only scripts/live-push-device-token.ts
 */
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

function readDeviceToken(): string {
  const adb =
    process.env.ADB ||
    path.join(
      process.env.LOCALAPPDATA || '',
      'Android',
      'Sdk',
      'platform-tools',
      'adb.exe',
    );
  const xml = execSync(
    `"${adb}" shell run-as com.ffsensitivity.app cat shared_prefs/com.google.android.gms.appid.xml`,
    { encoding: 'utf8', windowsHide: true },
  );
  const jsonTok = xml.match(/"token"\s*:\s*"([^"]+)"/);
  if (jsonTok?.[1] && jsonTok[1].length >= 20) return jsonTok[1];
  // Emulator GMS sometimes stores a mangled key; APA91… is still the registration token.
  const apa = xml.match(/[A-Za-z0-9_\-:]+:APA91[A-Za-z0-9_\-]+/);
  if (apa?.[0] && apa[0].length >= 40) return apa[0];
  throw new Error('device_fcm_token_missing');
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
  const json = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const projectId = json.project_id || json.projectId;
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(json),
      projectId,
    });
  }

  const token = readDeviceToken();
  console.log(`PASS device_token_len=${token.length}`);

  const stamp = new Date().toISOString().slice(11, 19);
  const title = `Device Test ${stamp}`;
  const body = 'Tray notification E2E — open Challenge';
  const deepLink = 'ffops://challenge';

  try {
    const id = await admin.messaging().send({
      token,
      notification: { title, body },
      data: { title, body, deepLink },
      android: {
        priority: 'high',
        ttl: 86400000,
        notification: {
          channelId: 'ff_ops_push',
          icon: 'ic_stat_ff_notification',
          color: '#E8A838',
          priority: 'high',
          defaultSound: true,
        },
      },
    });
    console.log(`PASS fcm_device_token messageId=${id.slice(0, 28)}…`);
  } catch (e: any) {
    console.log(
      `FAIL fcm_device_token code=${e?.code || 'ERR'} msg=${e?.message || e}`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(1);
});
