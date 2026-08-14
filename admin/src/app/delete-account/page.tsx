import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account",
  description:
    "How to request deletion of your FF Sensi Pro / FF Sensitivity Settings app account and associated data.",
  robots: { index: true, follow: true },
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. App this page covers",
    body: [
      "This page explains how to request deletion of your account and associated data for the Android app FF Sensi Pro (package com.ffsensitivity.app), also described as FF Sensitivity Settings, operated under the Sensitivity Settings brand.",
      "Store listing name may appear as FF Sensi Pro - Sensitivity Settings for FF Max.",
    ],
  },
  {
    title: "2. How to request account deletion",
    body: [
      "There is no in-app one-tap delete button yet. To delete your account, email us from the same Google account email you use to sign in to the App.",
      "Send an email to: support@sensitivitysettings.com",
      "Subject line (recommended): Delete my FF Sensi Pro account",
      "In the email body, include: (1) the email of your Google Sign-In account, (2) a clear request to delete your account and associated App data, and (3) your app version if you know it.",
      "We may ask a short verification question to confirm you own the account before we delete it.",
    ],
  },
  {
    title: "3. What we delete",
    body: [
      "After we verify your request, we delete or anonymize account-linked App data that we control, including profile/session identifiers tied to your Google Sign-In, coin wallet and economy ledger entries, challenge / quiz progress, shop purchase history, scratch / redeem claims, community posts you created (where still stored), support messages you sent, and push notification tokens for your devices.",
      "Device diagnostics that are not tied to your account may already be aggregated or discarded under our normal retention practices.",
    ],
  },
  {
    title: "4. What we may keep for a limited time",
    body: [
      "We may retain limited records if required for security, fraud prevention, abuse investigation, legal compliance, or dispute resolution (for example logs showing that a deletion request was received and completed).",
      "Any such retention is limited to what is reasonably necessary and is not used to restore your App account for normal use.",
      "Gift codes or rewards already delivered to you outside the App (for example a Google Play or Amazon gift code you redeemed) cannot be “un-sent”; those third-party products are governed by their issuers.",
    ],
  },
  {
    title: "5. Timing",
    body: [
      "We aim to complete verified deletion requests within 30 days. Many requests are handled sooner.",
      "You will receive a confirmation email when the deletion is complete, or if we need more information to verify the request.",
    ],
  },
  {
    title: "6. Google Account",
    body: [
      "Deleting your App account does not delete your Google Account. To revoke the App’s Google Sign-In access, use your Google Account security settings.",
    ],
  },
  {
    title: "7. Contact",
    body: [
      "FF Sensitivity Settings / FF Sensi Pro",
      "Email: support@sensitivitysettings.com",
      "Privacy Policy: https://app.sensitivitysettings.com/privacy",
      "Terms: https://app.sensitivitysettings.com/terms",
    ],
  },
];

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber-400 uppercase">
          FF Sensi Pro · Android App
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Delete Account & Data
        </h1>
        <p className="mt-3 text-sm text-slate-400">Last updated: 14 August 2026</p>
        <p className="mt-6 text-[15px] leading-7 text-slate-300">
          Use this page to request deletion of your FF Sensi Pro account and the
          associated data we store for the App.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title} className="border-t border-white/10 pt-6">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((para, i) => (
                  <p
                    key={`${section.title}-${i}`}
                    className="text-[15px] leading-7 text-slate-300"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 space-y-3 border-t border-white/10 pt-6 text-sm">
          <p className="font-semibold tracking-wide text-slate-400 uppercase">
            Related
          </p>
          <a
            href="https://app.sensitivitysettings.com/privacy"
            className="block font-semibold text-amber-400 underline underline-offset-4"
          >
            Privacy Policy
          </a>
          <a
            href="https://app.sensitivitysettings.com/terms"
            className="block font-semibold text-amber-400 underline underline-offset-4"
          >
            Terms & Conditions
          </a>
        </div>
      </div>
    </main>
  );
}
