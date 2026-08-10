"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFirebaseAdmin = initFirebaseAdmin;
exports.sendFcmCampaign = sendFcmCampaign;
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app_error_1 = require("../common/errors/app-error");
let ready = false;
function resolveCredentialPath() {
    const raw = process.env.FIREBASE_ADMIN_PATH?.trim() || 'secrets/firebase-admin.json';
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}
function initFirebaseAdmin() {
    if (ready)
        return true;
    if (admin.apps.length > 0) {
        ready = true;
        return true;
    }
    const credPath = resolveCredentialPath();
    if (!fs.existsSync(credPath)) {
        return false;
    }
    const json = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(json),
        projectId: typeof json.projectId === 'string'
            ? json.projectId
            : json.project_id,
    });
    ready = true;
    return true;
}
function buildAndroidMessage(input) {
    return {
        notification: { title: input.title, body: input.body },
        data: {
            title: input.title,
            body: input.body,
            deepLink: input.deepLink,
        },
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
    };
}
async function sendFcmCampaign(input) {
    if (!initFirebaseAdmin()) {
        throw new app_error_1.AppError('PUSH_FCM_UNCONFIGURED', 'Firebase Admin credentials missing. Set FIREBASE_ADMIN_PATH.', 503);
    }
    const msg = buildAndroidMessage(input);
    if (input.audience === 'TOPIC' && input.topic) {
        try {
            await admin.messaging().send({
                topic: input.topic,
                notification: msg.notification,
                data: msg.data,
                android: msg.android,
            });
            return {
                mode: 'fcm',
                delivered: 1,
                failed: 0,
                unregisteredTokens: [],
            };
        }
        catch {
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
    const unregisteredTokens = [];
    if (input.audience === 'ALL') {
        try {
            await admin.messaging().send({
                topic: 'all_users',
                notification: msg.notification,
                data: msg.data,
                android: msg.android,
            });
        }
        catch {
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
            notification: msg.notification,
            data: msg.data,
            android: msg.android,
        });
        delivered += res.successCount;
        failed += res.failureCount;
        res.responses.forEach((response, index) => {
            if (!response.success &&
                response.error?.code ===
                    'messaging/registration-token-not-registered') {
                unregisteredTokens.push(chunk[index]);
            }
        });
    }
    return { mode: 'fcm', delivered, failed, unregisteredTokens };
}
//# sourceMappingURL=push-fcm.js.map