"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiClientError } from "@/lib/api";
import { ProfileAccessCard } from "@/components/profile-desk/ProfileAccessCard";
import { ProfileAccountCard } from "@/components/profile-desk/ProfileAccountCard";
import { ProfileCapabilities } from "@/components/profile-desk/ProfileCapabilities";
import { ProfileHeader } from "@/components/profile-desk/ProfileHeader";
import { ProfileIdentityCard } from "@/components/profile-desk/ProfileIdentityCard";
import { ProfileSecurityCard } from "@/components/profile-desk/ProfileSecurityCard";
import { ProfileStats } from "@/components/profile-desk/ProfileStats";
import { ProfileTabs } from "@/components/profile-desk/ProfileTabs";
import {
  changeMyPassword,
  fetchMyProfile,
  saveMyProfile,
} from "@/components/profile-desk/profile-api";
import {
  computeProfileStats,
  defaultDraftFromSession,
  draftFromProfile,
  emptySecurityForm,
  readProfileSession,
  readStorageScope,
  sessionFromProfile,
  syncStoredAdminBlob,
  validateProfileAccount,
  validateProfileIdentity,
  validateProfileSecurity,
  type ProfileDraft,
  type ProfileSessionInfo,
  type ProfileTabId,
} from "@/components/profile-desk/profile-data";

// --- Start: Admin profile live wire (Sachin) ---
export default function ProfilePage() {
  const [session, setSession] = useState<ProfileSessionInfo | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [tab, setTab] = useState<ProfileTabId>("identity");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState<string>("");

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const scope = readStorageScope();
    const localSession = readProfileSession();
    try {
      const profile = await fetchMyProfile();
      const nextSession = sessionFromProfile(profile, scope);
      const nextDraft = draftFromProfile(profile);
      setSession(nextSession);
      setDraft(nextDraft);
      setBaseline(
        JSON.stringify({
          identity: nextDraft.identity,
          account: nextDraft.account,
        }),
      );
      syncStoredAdminBlob(profile);
    } catch (e) {
      setSession(localSession);
      setDraft(defaultDraftFromSession(localSession));
      setBaseline("");
      setError(
        e instanceof ApiClientError
          ? e.message
          : "Could not load profile from API.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const stats = useMemo(() => {
    if (!session || !draft) return null;
    return computeProfileStats(session, draft);
  }, [session, draft]);

  async function saveProfile() {
    if (!session || !draft || saving) return;

    const identityErr = validateProfileIdentity(draft.identity);
    if (identityErr) {
      setError(identityErr);
      setNotice(null);
      setTab("identity");
      return;
    }
    const accountErr = validateProfileAccount(draft.account);
    if (accountErr) {
      setError(accountErr);
      setNotice(null);
      setTab("account");
      return;
    }
    const securityErr = validateProfileSecurity(draft.security);
    if (securityErr) {
      setError(securityErr);
      setNotice(null);
      setTab("security");
      return;
    }

    const rotating = Boolean(draft.security.newPassword);
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      let profile = await saveMyProfile({
        identity: draft.identity,
        account: draft.account,
      });

      if (rotating) {
        profile = await changeMyPassword(draft.security);
      }

      const nextSession = sessionFromProfile(profile, session.storageScope);
      const nextDraft = draftFromProfile(profile);
      setSession(nextSession);
      setDraft(nextDraft);
      setBaseline(
        JSON.stringify({
          identity: nextDraft.identity,
          account: nextDraft.account,
        }),
      );
      syncStoredAdminBlob(profile);
      setNotice(
        rotating
          ? `Saved — password updated for ${profile.displayName}. Other refresh sessions were revoked.`
          : `Saved — ${profile.displayName} · ${profile.notifyEmail}.`,
      );
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? e.message
          : "Save failed. Check API and try again.",
      );
      if (rotating) setTab("security");
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    if (!session || !draft) return;
    if (baseline) {
      try {
        const parsed = JSON.parse(baseline) as {
          identity: ProfileDraft["identity"];
          account: ProfileDraft["account"];
        };
        setDraft({
          identity: parsed.identity,
          account: parsed.account,
          security: emptySecurityForm(),
        });
      } catch {
        setDraft(defaultDraftFromSession(session));
      }
    } else {
      setDraft(defaultDraftFromSession(session));
    }
    setError(null);
    setNotice("Draft reset from last loaded profile.");
    setTab("identity");
  }

  if (loading || !session || !draft || !stats) {
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="rounded-2xl border border-[#e8eaee] bg-white px-5 py-10 text-center text-[13px] text-slate-500">
          Loading profile…
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ProfileHeader
        onSave={saving ? undefined : () => void saveProfile()}
        onReset={saving ? undefined : resetDraft}
      />
      <ProfileStats
        displayName={stats.displayName}
        role={stats.role}
        modules={stats.modules}
        storage={stats.storage}
        mustChange={stats.mustChange}
      />

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-[13px] font-medium text-indigo-950"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}
      {saving ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-600">
          Saving to Nest…
        </div>
      ) : null}

      <ProfileTabs active={tab} onChange={setTab} />

      {tab === "identity" ? (
        <ProfileIdentityCard
          identity={draft.identity}
          session={session}
          onChange={(identity) => setDraft((d) => (d ? { ...d, identity } : d))}
        />
      ) : null}

      {tab === "account" ? (
        <ProfileAccountCard
          account={draft.account}
          onChange={(account) => setDraft((d) => (d ? { ...d, account } : d))}
        />
      ) : null}

      {tab === "security" ? (
        <ProfileSecurityCard
          security={draft.security}
          mustChangePassword={session.mustChangePassword}
          onChange={(security) => setDraft((d) => (d ? { ...d, security } : d))}
        />
      ) : null}

      {tab === "access" ? <ProfileAccessCard session={session} /> : null}

      <ProfileCapabilities />
    </section>
  );
}
// --- End: Admin profile live wire (Sachin) ---
