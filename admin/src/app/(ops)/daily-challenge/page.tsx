"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChallengeCapabilities } from "@/components/challenge/ChallengeCapabilities";
import { ChallengeEmptyState } from "@/components/challenge/ChallengeEmptyState";
import { ChallengeHeader } from "@/components/challenge/ChallengeHeader";
import { ChallengeMilestoneFormModal } from "@/components/challenge/ChallengeMilestoneFormModal";
import { ChallengeMilestoneTable } from "@/components/challenge/ChallengeMilestoneTable";
import { ChallengePagination } from "@/components/challenge/ChallengePagination";
import { ChallengeQuizFormModal } from "@/components/challenge/ChallengeQuizFormModal";
import { ChallengeQuizTable } from "@/components/challenge/ChallengeQuizTable";
import { ChallengeRulesPanel } from "@/components/challenge/ChallengeRulesPanel";
import { ChallengeQuizCoinsCard } from "@/components/challenge/ChallengeQuizCoinsCard";
import { ChallengeQuizTimingCard } from "@/components/challenge/ChallengeQuizTimingCard";
import { ChallengeStats } from "@/components/challenge/ChallengeStats";
import { ChallengeTabs } from "@/components/challenge/ChallengeTabs";
import {
  ChallengeToolbar,
  type ChallengeListFilter,
} from "@/components/challenge/ChallengeToolbar";
import {
  fetchChallengeBundle,
  saveChallengeBundle,
} from "@/components/challenge/challenge-api";
import {
  CHALLENGE_DEFAULT_RULES,
  computeChallengeStats,
  emptyMilestoneForm,
  emptyQuizForm,
  formToMilestone,
  formToQuiz,
  milestoneToForm,
  quizToForm,
  type ChallengeRules,
  type ChallengeTabId,
  type MilestoneFormValues,
  type MilestoneRow,
  type QuizFormValues,
  type QuizQuestionRow,
} from "@/components/challenge/challenge-data";

const PAGE_SIZE = 12;

function snapshotKey(
  rules: ChallengeRules,
  quiz: QuizQuestionRow[],
  milestones: MilestoneRow[],
) {
  return JSON.stringify({ rules, quiz, milestones });
}

function canAccessChallengeModule(): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as {
      role?: string;
      allowedModules?: string[];
    };
    if (admin.role === "SUPER_ADMIN") return true;
    return Array.isArray(admin.allowedModules)
      ? admin.allowedModules.includes("daily_challenge") ||
          admin.allowedModules.includes("challenge")
      : false;
  } catch {
    return false;
  }
}

export default function DailyChallengePage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ChallengeTabId>("rules");
  const [rules, setRules] = useState<ChallengeRules>(CHALLENGE_DEFAULT_RULES);
  const [quiz, setQuiz] = useState<QuizQuestionRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [savedKey, setSavedKey] = useState(() =>
    snapshotKey(CHALLENGE_DEFAULT_RULES, [], []),
  );

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChallengeListFilter>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizMode, setQuizMode] = useState<"add" | "edit">("add");
  const [quizEditingId, setQuizEditingId] = useState<string | null>(null);
  const [quizInitial, setQuizInitial] = useState(emptyQuizForm());

  const [msOpen, setMsOpen] = useState(false);
  const [msMode, setMsMode] = useState<"add" | "edit">("add");
  const [msEditingId, setMsEditingId] = useState<string | null>(null);
  const [msInitial, setMsInitial] = useState(emptyMilestoneForm());

  const dirty = snapshotKey(rules, quiz, milestones) !== savedKey;
  const stats = useMemo(
    () => computeChallengeStats(quiz, milestones, rules),
    [quiz, milestones, rules],
  );

  useEffect(() => {
    setAllowed(canAccessChallengeModule());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchChallengeBundle();
      setRules(bundle.rules);
      setQuiz(bundle.quiz);
      setMilestones(bundle.milestones);
      setSavedKey(snapshotKey(bundle.rules, bundle.quiz, bundle.milestones));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load challenge.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void load();
  }, [allowed, load]);

  useEffect(() => {
    setPage(1);
  }, [filter, query, tab]);

  const quizFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quiz.filter((row) => {
      if (filter === "live" && !row.enabled) return false;
      if (filter === "disabled" && row.enabled) return false;
      if (!q) return true;
      return (
        row.question.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q) ||
        row.options.some((o) => o.toLowerCase().includes(q))
      );
    });
  }, [quiz, query, filter]);

  const msFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return milestones
      .slice()
      .sort((a, b) => a.days - b.days)
      .filter((row) => {
        if (filter === "live" && !row.enabled) return false;
        if (filter === "disabled" && row.enabled) return false;
        if (!q) return true;
        return (
          row.title.toLowerCase().includes(q) ||
          row.rewardLabel.toLowerCase().includes(q) ||
          row.id.toLowerCase().includes(q) ||
          String(row.days).includes(q)
        );
      });
  }, [milestones, query, filter]);

  const list = tab === "quiz" ? quizFiltered : msFiltered;
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, page]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveChallengeBundle({ rules, quiz, milestones });
      setRules(saved.rules);
      setQuiz(saved.quiz);
      setMilestones(saved.milestones);
      setSavedKey(snapshotKey(saved.rules, saved.quiz, saved.milestones));
      setNotice("Challenge saved to Nest — Android picks this up on next sync.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    void load().then(() => setNotice("Reverted to last saved server draft."));
  }

  function openAddQuiz() {
    if (quiz.length >= 1500) {
      setError("Quiz bank is full (max 1500 questions).");
      return;
    }
    setTab("quiz");
    setQuizMode("add");
    setQuizEditingId(null);
    setQuizInitial(emptyQuizForm());
    setQuizOpen(true);
  }

  function openEditQuiz(id: string) {
    const row = quiz.find((r) => r.id === id);
    if (!row) return;
    setQuizMode("edit");
    setQuizEditingId(id);
    setQuizInitial(quizToForm(row));
    setQuizOpen(true);
  }

  function saveQuiz(values: QuizFormValues): string | null {
    if (quizMode === "add") {
      if (quiz.length >= 1500) return "Quiz bank is full (max 1500 questions).";
      const id = values.id.trim() || `q_${Date.now()}`;
      if (quiz.some((r) => r.id === id)) return "Question ID already exists.";
      const result = formToQuiz(values, id);
      if ("error" in result) return result.error;
      setQuiz((prev) => [result, ...prev]);
      setNotice(`Added question ${result.id}. Save to push live.`);
      return null;
    }
    if (!quizEditingId) return "Nothing to edit.";
    const result = formToQuiz({ ...values, id: quizEditingId }, quizEditingId);
    if ("error" in result) return result.error;
    setQuiz((prev) => prev.map((r) => (r.id === quizEditingId ? result : r)));
    setNotice("Quiz question updated. Save to push live.");
    return null;
  }

  function openAddMilestone() {
    setTab("milestones");
    setMsMode("add");
    setMsEditingId(null);
    setMsInitial(emptyMilestoneForm());
    setMsOpen(true);
  }

  function openEditMilestone(id: string) {
    const row = milestones.find((r) => r.id === id);
    if (!row) return;
    setMsMode("edit");
    setMsEditingId(id);
    setMsInitial(milestoneToForm(row));
    setMsOpen(true);
  }

  function saveMilestone(values: MilestoneFormValues): string | null {
    if (msMode === "add") {
      const id = values.id.trim() || `m_${values.days || Date.now()}`;
      if (milestones.some((r) => r.id === id)) {
        return "Milestone ID already exists.";
      }
      const days = Number(values.days);
      if (milestones.some((r) => r.days === days)) {
        return "A milestone for this day already exists.";
      }
      const result = formToMilestone(values, id);
      if ("error" in result) return result.error;
      setMilestones((prev) => [...prev, result].sort((a, b) => a.days - b.days));
      setNotice(`Added milestone Day ${result.days}. Save to push live.`);
      return null;
    }
    if (!msEditingId) return "Nothing to edit.";
    const result = formToMilestone(
      { ...values, id: msEditingId },
      msEditingId,
    );
    if ("error" in result) return result.error;
    if (
      milestones.some((r) => r.id !== msEditingId && r.days === result.days)
    ) {
      return "A milestone for this day already exists.";
    }
    setMilestones((prev) =>
      prev
        .map((r) => (r.id === msEditingId ? result : r))
        .sort((a, b) => a.days - b.days),
    );
    setNotice(`Updated milestone Day ${result.days}. Save to push live.`);
    return null;
  }

  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <h1 className="text-[17px] font-bold text-rose-950">No Challenge access</h1>
        <p className="mt-2 text-[13px] text-rose-800">
          Your staff role is missing the <code>daily_challenge</code> module.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-5">
      <ChallengeHeader
        dirty={dirty}
        tab={tab}
        onSave={() => void handleSave()}
        onReset={handleReset}
        onAddQuiz={openAddQuiz}
        onAddMilestone={openAddMilestone}
      />
      <ChallengeStats
        quizLive={stats.quizLive}
        milestonesLive={stats.milestonesLive}
        firstGate={stats.firstGate}
        tasks={stats.tasks}
      />
      <ChallengeTabs
        active={tab}
        onChange={(next) => {
          setTab(next);
          setQuery("");
          setFilter("all");
          setNotice(null);
        }}
      />

      {loading ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
          Loading challenge config…
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-900"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-[13px] font-medium text-orange-950"
        >
          {notice}
          {saving ? " (saving…)" : ""}
        </div>
      ) : null}

      {!loading && tab === "rules" ? (
        <>
          <ChallengeRulesPanel
            rules={rules}
            onChange={(next) => {
              setRules(next);
              setNotice(null);
            }}
          />
          <ChallengeQuizTimingCard
            rules={rules}
            onChange={(next) => {
              setRules(next);
              setNotice(null);
            }}
          />
          <ChallengeQuizCoinsCard
            rules={rules}
            onChange={(next) => {
              setRules(next);
              setNotice(null);
            }}
          />
        </>
      ) : null}

      {!loading && (tab === "quiz" || tab === "milestones") ? (
        <>
          <ChallengeToolbar
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
            placeholder={
              tab === "quiz"
                ? "Search question or option…"
                : "Search title, day, reward…"
            }
          />
          {tab === "quiz" ? (
            quiz.length === 0 ? (
              <ChallengeEmptyState kind="quiz" onAdd={openAddQuiz} />
            ) : quizFiltered.length === 0 ? (
              <ChallengeEmptyState
                kind="filter"
                onClearFilter={() => {
                  setFilter("all");
                  setQuery("");
                }}
              />
            ) : (
              <ChallengeQuizTable
                rows={paged as QuizQuestionRow[]}
                notice={null}
                onEdit={openEditQuiz}
                onToggle={(id) => {
                  setQuiz((prev) =>
                    prev.map((r) =>
                      r.id === id ? { ...r, enabled: !r.enabled } : r,
                    ),
                  );
                  setNotice("Quiz status updated. Save to push live.");
                }}
                onDelete={(id) => {
                  const row = quiz.find((r) => r.id === id);
                  if (!row) return;
                  if (!window.confirm(`Delete question “${row.id}”?`)) return;
                  setQuiz((prev) => prev.filter((r) => r.id !== id));
                  setNotice(`Deleted ${row.id}. Save to push live.`);
                }}
                footer={
                  <ChallengePagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={quizFiltered.length}
                    onPage={setPage}
                  />
                }
              />
            )
          ) : milestones.length === 0 ? (
            <ChallengeEmptyState kind="milestones" onAdd={openAddMilestone} />
          ) : msFiltered.length === 0 ? (
            <ChallengeEmptyState
              kind="filter"
              onClearFilter={() => {
                setFilter("all");
                setQuery("");
              }}
            />
          ) : (
            <ChallengeMilestoneTable
              rows={paged as MilestoneRow[]}
              notice={null}
              onEdit={openEditMilestone}
              onToggle={(id) => {
                setMilestones((prev) =>
                  prev.map((r) =>
                    r.id === id ? { ...r, enabled: !r.enabled } : r,
                  ),
                );
                setNotice("Milestone status updated. Save to push live.");
              }}
              onDelete={(id) => {
                const row = milestones.find((r) => r.id === id);
                if (!row) return;
                if (
                  !window.confirm(
                    `Delete milestone Day ${row.days} (“${row.title}”)?`,
                  )
                ) {
                  return;
                }
                setMilestones((prev) => prev.filter((r) => r.id !== id));
                setNotice(`Deleted Day ${row.days}. Save to push live.`);
              }}
              footer={
                <ChallengePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={msFiltered.length}
                  onPage={setPage}
                />
              }
            />
          )}
        </>
      ) : null}

      <ChallengeCapabilities />

      <ChallengeQuizFormModal
        open={quizOpen}
        mode={quizMode}
        initial={quizInitial}
        onClose={() => setQuizOpen(false)}
        onSubmit={saveQuiz}
      />
      <ChallengeMilestoneFormModal
        open={msOpen}
        mode={msMode}
        initial={msInitial}
        onClose={() => setMsOpen(false)}
        onSubmit={saveMilestone}
      />
    </section>
  );
}
