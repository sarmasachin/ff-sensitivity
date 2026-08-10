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

  const data = {
    title: input.title,
    body: input.body,
    deepLink: input.deepLink,
  };

  if (input.audience === 'TOPIC' && input.topic) {
    try {
      await admin.messaging().send({
        topic: input.topic,
        notification: { title: input.title, body: input.body },
        data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'ff_ops_push',
            icon: 'ic_stat_ff_notification',
            color: '#E8A838',
          },
        },
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
  if (tokens.length === 0) {
    return {
      mode: 'fcm',
      delivered: 0,
      failed: 0,
      unregisteredTokens: [],
    };
  }

  let delivered = 0;
  let failed = 0;
  const unregisteredTokens: string[] = [];
  const chunkSize = 400;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title: input.title, body: input.body },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'ff_ops_push',
          icon: 'ic_stat_ff_notification',
          color: '#E8A838',
        },
      },
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
