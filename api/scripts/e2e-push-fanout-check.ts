/**
 * Dry e2e: admin ALL must be one FCM (topic), never topic+token.
 * Does not send live FCM.
 */
import * as fs from 'fs';
import * as path from 'path';

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const fcm = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'push', 'push-fcm.ts'),
  'utf8',
);
const svc = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'push', 'push.service.ts'),
  'utf8',
);
const app = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'app',
    'src',
    'main',
    'java',
    'com',
    'ffsensitivity',
    'app',
    'push',
    'FfFirebaseMessagingService.kt',
  ),
  'utf8',
);

const allIdx = fcm.indexOf("if (input.audience === 'ALL')");
const allReturn = fcm.indexOf('return {', allIdx);
const multiIdx = fcm.indexOf('sendEachForMulticast');
allIdx >= 0 && allReturn > allIdx && allReturn < multiIdx
  ? pass('all_returns_before_multicast')
  : fail('all_returns_before_multicast', `all=${allIdx} ret=${allReturn} multi=${multiIdx}`);

const allBlock = fcm.slice(allIdx, multiIdx);
(allBlock.match(/admin\.messaging\(\)\.send\(/g) || []).length === 1
  ? pass('all_one_fcm_send')
  : fail('all_one_fcm_send');

fcm.includes("topic: 'all_users'")
  ? pass('all_uses_all_users_topic')
  : fail('all_uses_all_users_topic');

const build = fcm.slice(
  fcm.indexOf('function buildAndroidMessage'),
  fcm.indexOf('export async function sendFcmCampaign'),
);
!build.includes('notification:')
  ? pass('payload_is_data_only')
  : fail('payload_is_data_only');

build.includes('collapseKey')
  ? pass('collapse_key_set')
  : fail('collapse_key_set');

svc.includes('campaignId: campaign.id')
  ? pass('admin_send_passes_campaign_id')
  : fail('admin_send_passes_campaign_id');

svc.includes('sendFcmCampaign({') &&
  (svc.match(/sendFcmCampaign\(/g) || []).length === 1
  ? pass('single_admin_fcm_entry')
  : fail('single_admin_fcm_entry');

app.includes('campaignId.hashCode()')
  ? pass('app_replaces_same_campaign_tray')
  : fail('app_replaces_same_campaign_tray');

!app.includes('Paint.Style.FILL')
  ? pass('app_no_triangle_circle_plate')
  : fail('app_no_triangle_circle_plate');

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
