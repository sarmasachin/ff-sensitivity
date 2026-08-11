import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { AppError } from '../common/errors/app-error';

// --- Start: Push FCM live wire (Sachin) ---
let ready = false;

function resolveCredentialPath(): string {
  const raw =
    process.env.FIREBASE_ADMIN_PATH?.trim() || 'secrets/firebase-admin.json';
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function initFirebaseAdmin(): boolean {
  if (ready) return true;
  if (admin.apps.length > 0) {
    ready = true;
    return true;
  }
  const credPath = resolveCredentialPath();
  if (!fs.existsSync(credPath)) {
    return false;
  }
  const json = JSON.parse(fs.readFileSync(credPath, 'utf8')) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(json),
    projectId: typeof json.projectId === 'string'
      ? json.projectId
      : (json as { project_id?: string }).project_id,
  });
  ready = true;
  return true;
}

export type FcmSendResult = {
  mode: 'fcm';
  delivered: number;
  failed: number;
  unregisteredTokens: string[];
};

function buildAndroidMessage(input: {
  title: string;
  body: string;
  deepLink: string;
}): {
  data: Record<string, string>;
  android: admin.messaging.AndroidConfig;
} {
  // Data-only. A `notification` (or android.notification) payload makes
  // Android show the system tray itself and skip onMessageReceived when the
  // app is in background/killed — if that system display fails, nothing
  // appears. The app already posts the shade from onMessageReceived.
  return {
    data: {
      title: input.title,
      body: input.body,
      deepLink: input.deepLink,
    },
    android: {
      priority: 'high',
      ttl: 86400000,
    },
  };
}

export async function sendFcmCampaign(input: {
  title: string;
  body: string;
  deepLink: string;
  audience: 'ALL' | 'ACTIVE_7D' | 'NO_CLAIM' | 'TOPIC';
  topic: string;
  tokens: string[];
}): Promise<FcmSendResult> {
  if (!initFirebaseAdmin()) {
    throw new AppError(
      'PUSH_FCM_UNCONFIGURED',
      'Firebase Admin credentials missing. Set FIREBASE_ADMIN_PATH.',
      503,
    );
  }

  const msg = buildAndroidMessage(input);

  if (input.audience === 'TOPIC' && input.topic) {
    try {
      await admin.messaging().send({
        topic: input.topic,
        data: msg.data,
        android: msg.android,
      });
      return {
        mode: 'fcm',
        delivered: 1,
        failed: 0,
        unregisteredTokens: [],
      };
    } catch {
      return {
        mode: 'fcm',
        delivered: 0,
        failed: 1,
        unregisteredTokens: [],
      };
    }
  }

  const tokens = [...new Set(input.tokens.filter((t) => t.length >= 20))];
  let delivered = 0;
  let failed = 0;
  const unregisteredTokens: string[] = [];

  // Tray: every phone that opened the app subscribed to all_users.
  // Do this even when the token ledger is empty. Do not add to delivered —
  // admin count stays unique live tokens only.
  if (input.audience === 'ALL') {
    try {
      await admin.messaging().send({
        topic: 'all_users',
        data: msg.data,
        android: msg.android,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[push-fcm] all_users topic send failed', e);
    }
  }

  if (tokens.length === 0) {
    return {
      mode: 'fcm',
      delivered: 0,
      failed: 0,
      unregisteredTokens: [],
    };
  }

  const chunkSize = 400;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      data: msg.data,
      android: msg.android,
    });
    delivered += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((response, index) => {
      if (
        !response.success &&
        response.error?.code ===
          'messaging/registration-token-not-registered'
      ) {
        unregisteredTokens.push(chunk[index]);
      }
    });
  }
  return { mode: 'fcm', delivered, failed, unregisteredTokens };
}
// --- End: Push FCM live wire (Sachin) ---
