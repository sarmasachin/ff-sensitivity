import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for the FF Sensitivity Settings Android app — how we collect, use, and protect your information.",
  robots: { index: false, follow: false },
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Who this policy is for",
    body: [
      "This Privacy Policy applies to the FF Sensitivity Settings Android application (the “App”), operated independently under the Sensitivity Settings brand.",
      "The App is a fan-made utility for Free Fire players. It is not owned by, operated by, affiliated with, endorsed by, or sponsored by Garena International or any other game publisher.",
      "By using the App, you agree to this Privacy Policy. If you do not agree, please stop using the App.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "Account & sign-in: When you sign in with Google, we receive basic account details needed to create and secure your App session (such as a verified Google ID token, and typically your name and email associated with that Google account).",
      "Device & gameplay setup: Information you provide or that the App reads to generate recommendations — for example device model, RAM, display refresh rate, DPI-related values, finger count / play style, and similar setup fields. These are used to calculate sensitivity, HUD, graphics, and DPI guidance.",
      "In-app activity: Progress and economy data tied to your account, such as daily challenge status, streak, quiz activity, coin wallet balance, shop purchases, scratch / redeem history, and community share cards you choose to submit.",
      "Support: If you contact us in-app, we store the message content plus basic context (such as app version) so we can reply and resolve your request.",
      "Notifications (optional): If you allow push notifications, we store the device push token required to deliver alerts you opted into.",
      "Technical & security data: Limited diagnostics such as approximate request timing, app version, and security signals used to prevent abuse, rate-limit attacks, and keep the service reliable. We do not ask for your Free Fire / Garena password.",
    ],
  },
  {
    title: "3. How we use information",
    body: [
      "To run your signed-in experience (login, session, syncing rewards and settings across devices where supported).",
      "To generate and improve sensitivity, HUD, graphics, DPI, stylish-name, and related recommendations.",
      "To operate daily challenges, coin shop, scratch cards, redeem codes, and community features you choose to use.",
      "To respond to support requests and keep the App secure (spam, fraud, and abuse prevention).",
      "To send optional push notifications only after you grant permission.",
      "We do not sell your personal information. We do not use your data to impersonate Garena or any game publisher.",
    ],
  },
  {
    title: "4. Google Sign-In",
    body: [
      "The App uses Google Sign-In. Google’s handling of your Google Account is governed by Google’s own policies.",
      "We use Google identity only to authenticate you into the App. We do not receive or store your Google password.",
    ],
  },
  {
    title: "5. Sharing of information",
    body: [
      "We may share information only with trusted service providers that help us operate the App (for example hosting, databases, email/push delivery, crash or analytics tools), under appropriate safeguards.",
      "We may disclose information if required by law, or to protect the safety, rights, and security of users and the App.",
      "If the App or related operations are transferred to a new operator, your information may move with it under continued privacy protections.",
      "Public community content you choose to publish (for example approved share cards) may be visible to other users as designed in the App.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We keep account, reward, support, and related records only as long as needed to operate the App, provide support, prevent abuse, and meet legal requirements.",
      "When data is no longer needed, we delete or anonymize it where practical.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We take reasonable technical and organizational steps to protect information (including encrypted transport where supported and access controls on our systems).",
      "No mobile app or online service can guarantee perfect security. Please protect your device and Google account.",
    ],
  },
  {
    title: "8. Children",
    body: [
      "The App is intended for a general audience and is not directed at children under 13 (or the higher minimum age required in your country).",
      "We do not knowingly collect personal information from children under that age. If you believe a child has provided personal data, contact us and we will delete it when we can verify the request.",
    ],
  },
  {
    title: "9. Your choices and rights",
    body: [
      "Depending on where you live, you may have rights to access, correct, delete, or limit use of your personal information, or to withdraw consent where applicable.",
      "You can also revoke Google access from your Google Account settings, disable notifications in Android settings, and stop using the App at any time.",
      "To make a privacy request, email support@sensitivitysettings.com from the address linked to your account when possible.",
    ],
  },
  {
    title: "10. Third-party services and game brands",
    body: [
      "The App may link to our website, Play Store listing, or other third-party pages. Those services have their own privacy practices.",
      "Free Fire and related trademarks belong to their respective owners and are referenced only to describe what the App helps players configure.",
    ],
  },
  {
    title: "11. International processing",
    body: [
      "The App and its servers may process information in locations outside your country. By using the App, you understand your information may be processed in those locations by us or our service providers.",
    ],
  },
  {
    title: "12. Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we publish updates.",
      "Continued use of the App after an update means you accept the revised policy.",
    ],
  },
  {
    title: "13. Contact",
    body: [
      "FF Sensitivity Settings",
      "Email: support@sensitivitysettings.com",
      "Website: https://sensitivitysettings.com",
      "This page explains how the Android App handles information. It is not formal legal advice.",
    ],
  },
];

export default function AppPrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber-400 uppercase">
          FF Sensitivity Settings · Android App
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-slate-400">Last updated: 7 August 2026</p>
        <p className="mt-6 text-[15px] leading-7 text-slate-300">
          This Privacy Policy describes how the FF Sensitivity Settings mobile
          app collects, uses, stores, and shares information. It is written for
          the App — not as a copy of the public website policy.
        </p>

        <p className="mt-5 text-[15px] leading-7 text-slate-300">
          Also read:{" "}
          <a
            href="https://app.sensitivitysettings.com/terms"
            className="font-semibold text-amber-400 underline underline-offset-4"
          >
            Terms & Conditions
          </a>
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title} className="border-t border-white/10 pt-6">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((para, i) => (
                  <p key={`${section.title}-${i}`} className="text-[15px] leading-7 text-slate-300">
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
            href="https://app.sensitivitysettings.com/terms"
            className="block font-semibold text-amber-400 underline underline-offset-4"
          >
            Terms & Conditions
          </a>
          <a
            href="https://sensitivitysettings.com"
            className="block font-semibold text-amber-400 underline underline-offset-4"
          >
            Website
          </a>
        </div>
      </div>
    </main>
  );
}
