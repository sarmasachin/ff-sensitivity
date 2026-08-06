import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms & Conditions for the FF Sensitivity Settings Android app — rules for using the app, rewards, and recommendations.",
  robots: { index: false, follow: false },
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Agreement to these Terms",
    body: [
      "These Terms & Conditions (“Terms”) govern your use of the FF Sensitivity Settings Android application (the “App”), operated independently under the Sensitivity Settings brand.",
      "By downloading, accessing, or using the App — including signing in with Google — you agree to these Terms. If you do not agree, do not use the App.",
    ],
  },
  {
    title: "2. About the App",
    body: [
      "FF Sensitivity Settings is a fan-made mobile companion that helps Free Fire players with sensitivity recommendations, HUD and graphics guidance, safe DPI limits, stylish names, daily challenges, coin rewards, a coin shop, redeem codes, scratch cards, community share cards, and related tools.",
      "The App is operated independently. It is not owned by, operated by, affiliated with, endorsed by, or sponsored by Garena International or any other game publisher.",
      "Free Fire and related names/trademarks belong to their respective owners and are used only to describe what the App helps players configure.",
    ],
  },
  {
    title: "3. Eligibility",
    body: [
      "You may use the App if you can form a binding agreement under the laws of your country.",
      "If you are under the age required in your country to use online services, you may use the App only with permission from a parent or guardian.",
      "The App is not directed to children under 13.",
    ],
  },
  {
    title: "4. Google Sign-In account",
    body: [
      "Access to core App features requires Google Sign-In. There is no guest mode and no email/password account created by us outside Google authentication.",
      "You are responsible for keeping your Google account secure. We do not receive or store your Google password.",
      "We may suspend or restrict access if we reasonably believe an account is being abused, compromised, or used in violation of these Terms.",
    ],
  },
  {
    title: "5. Recommendations are guidance only",
    body: [
      "Sensitivity, HUD, graphics, DPI, stylish-name outputs, and related suggestions are estimates and guidance only.",
      "Results can vary based on phone model, screen, DPI, performance, game version/update, controls, HUD layout, grip, play style, and personal preference.",
      "We do not guarantee better aim, headshots, wins, ranks, or any in-game performance. You apply settings at your own risk and discretion.",
      "Always follow Free Fire’s rules and fair-play policy. Do not use the App to cheat, exploit, or break publisher rules.",
    ],
  },
  {
    title: "6. Rewards, coins, shop, and redeem codes",
    body: [
      "Daily challenges, streaks, quizzes, coins, shop items, scratch cards, and redeem/gift codes are promotional App features and may change, pause, or end at any time.",
      "Rewards are not real-world money. Coin balances, boosts, styles, and similar items have no cash value outside the App unless we clearly say otherwise.",
      "Redeem or gift codes (when offered) are subject to availability, eligibility, and any limits we or a partner set. Codes may expire, be limited per user, or be withdrawn if misuse is detected.",
      "We may reverse or withhold rewards obtained through bugs, abuse, automation, or fraud.",
    ],
  },
  {
    title: "7. Acceptable use (rules for users)",
    body: [
      "These rules apply to you as a user of the App. The App does not ask for, and does not need, your Free Fire / Garena password, OTP, or payment details.",
      "You must not:",
      "• use the App for illegal, harmful, or abusive activity;",
      "• attempt to hack, overload, scrape, reverse engineer, or disrupt the App or its servers;",
      "• upload malware, spam, or misleading content;",
      "• impersonate another person, brand, or game publisher;",
      "• post offensive, hateful, sexual, or infringing content in community or support channels;",
      "• collect other users’ personal data from the App without permission;",
      "• use bots or automation that harms App performance, fairness, or security;",
      "• share Free Fire / Garena passwords, OTPs, payment details, or other sensitive credentials in the App.",
      "If you break these rules, we may remove content, freeze rewards, block access, or take other action.",
    ],
  },
  {
    title: "8. User submissions",
    body: [
      "If you send support messages, share sensitivity cards, comments, or other submissions, you confirm that the information is accurate to the best of your knowledge, that you have the right to submit it, and that it does not violate law or these Terms.",
      "You give us a non-exclusive right to use, store, moderate, display (where the feature is public), and process your submission to operate the App.",
      "Do not submit passwords, OTP codes, payment details, or other sensitive personal information.",
    ],
  },
  {
    title: "9. Intellectual property",
    body: [
      "App design, original text, recommendation presentation, branding we created, and other original materials belong to Sensitivity Settings or its licensors.",
      "You may use the App for personal, non-commercial use. You may not copy, mirror, scrape, resell, or republish our tools or content without permission, except for ordinary personal sharing of links or your own settings cards.",
    ],
  },
  {
    title: "10. Third-party services",
    body: [
      "The App may link to our website, Play Store listing, Privacy Policy page, or other third-party services (including Google Sign-In).",
      "We do not control third-party services and are not responsible for their content, products, privacy practices, or terms. Your use of those services is between you and that third party.",
    ],
  },
  {
    title: "11. Privacy",
    body: [
      "How we handle information in the App is described in our App Privacy Policy at https://app.sensitivitysettings.com/privacy.",
      "By using the App, you also acknowledge that Privacy Policy.",
    ],
  },
  {
    title: "12. Disclaimer of warranties",
    body: [
      "The App is provided on an “as is” and “as available” basis. To the maximum extent allowed by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.",
      "We do not warrant that the App will be uninterrupted, error-free, secure, or free of harmful components, or that recommendations or rewards will meet your expectations.",
    ],
  },
  {
    title: "13. Limitation of liability",
    body: [
      "To the maximum extent allowed by law, Sensitivity Settings and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, goodwill, game progress, account status, or gameplay outcome, arising from:",
      "• use of or inability to use the App;",
      "• settings you apply in any game;",
      "• rewards, shop items, redeem codes, or community content;",
      "• user submissions or third-party services; or",
      "• unauthorized access to or alteration of transmissions or data.",
      "If liability cannot be fully excluded under applicable law, our total liability for claims relating to the App will be limited to the amount you paid us (if any) for using the App in the 12 months before the claim, or USD 0 if the App is free.",
    ],
  },
  {
    title: "14. Indemnity",
    body: [
      "You agree to defend and hold harmless Sensitivity Settings and its operators from claims, damages, losses, and expenses (including reasonable legal fees) arising from your misuse of the App, your submissions, or your violation of these Terms or applicable law.",
    ],
  },
  {
    title: "15. Suspension and changes",
    body: [
      "We may change, suspend, or discontinue any part of the App at any time, including features, rewards, and availability.",
      "We may also update these Terms. The “Last updated” date will change when we publish updates. Continued use after an update means you accept the revised Terms.",
    ],
  },
  {
    title: "16. Governing law",
    body: [
      "These Terms are governed by the laws applicable in India, without regard to conflict-of-law rules, unless mandatory consumer laws in your country say otherwise.",
      "Courts in India shall have jurisdiction for disputes arising from these Terms, subject to any rights you have under local mandatory law.",
    ],
  },
  {
    title: "17. Contact",
    body: [
      "FF Sensitivity Settings",
      "Email: support@sensitivitysettings.com",
      "Website: https://sensitivitysettings.com",
      "App Privacy Policy: https://app.sensitivitysettings.com/privacy",
      "These Terms are for clear public rules of App use. They are not formal legal advice.",
    ],
  },
];

export default function AppTermsPage() {
  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber-400 uppercase">
          FF Sensitivity Settings · Android App
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Terms & Conditions
        </h1>
        <p className="mt-3 text-sm text-slate-400">Last updated: 7 August 2026</p>
        <p className="mt-6 text-[15px] leading-7 text-slate-300">
          These Terms govern use of the FF Sensitivity Settings mobile app. They
          are written for the App — not as a copy of the public website terms.
        </p>

        <p className="mt-5 text-[15px] leading-7 text-slate-300">
          Also read:{" "}
          <a
            href="https://app.sensitivitysettings.com/privacy"
            className="font-semibold text-amber-400 underline underline-offset-4"
          >
            Privacy Policy
          </a>
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
