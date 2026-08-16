"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChallengeBankSection, PAGE_SIZE } from "@/components/challenge/ChallengeBankSection";
import { ChallengeCapabilities } from "@/components/challenge/ChallengeCapabilities";
import { ChallengeHeader } from "@/components/challenge/ChallengeHeader";
import { ChallengeMilestoneFormModal } from "@/components/challenge/ChallengeMilestoneFormModal";
import { ChallengeQuizFormModal } from "@/components/challenge/ChallengeQuizFormModal";
import { ChallengeQuizCoinsCard } from "@/components/challenge/ChallengeQuizCoinsCard";
import { ChallengeQuizTimingCard } from "@/components/challenge/ChallengeQuizTimingCard";
import { ChallengeRulesPanel } from "@/components/challenge/ChallengeRulesPanel";
import { ChallengeStats } from "@/components/challenge/ChallengeStats";
import { ChallengeTabs } from "@/components/challenge/ChallengeTabs";
import type { ChallengeListFilter } from "@/components/challenge/ChallengeToolbar";
import {
  canAccessChallengeModule,
  snapshotRulesKey,
} from "@/components/challenge/challenge-access";
import {
  fetchChallengeBundle,
  saveChallengeBundle,
} from "@/components/challenge/challenge-api";
import {
  persistMilestone,
  persistQuiz,
  deleteMilestoneRow,
  deleteQuizRow,
  toggleMilestoneRow,
  toggleQuizRow,
} from "@/components/challenge/challenge-page-mutations";
import {
  CHALLENGE_DEFAULT_RULES,
  computeChallengeStats,
  emptyMilestoneForm,
  emptyQuizForm,
  milestoneToForm,
  quizToForm,
  type ChallengeRules,
  type ChallengeTabId,
  type MilestoneFormValues,
  type MilestoneRow,
  type QuizFormValues,
  type QuizQuestionRow,
} from "@/components/challenge/challenge-data";
import { CHALLENGE_TOAST_TITLES } from "@/components/challenge/challenge-toast";
import { RedeemToastHost } from "@/components/redeem/RedeemToastHost";
import { useRedeemToasts } from "@/components/redeem/useRedeemToasts";

export default function DailyChallengePage() {
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ChallengeTabId>("rules");
  const [rules, setRules] = useState<ChallengeRules>(CHALLENGE_DEFAULT_RULES);
  const [quiz, setQuiz] = useState<QuizQuestionRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [savedKey, setSavedKey] = useState(() =>
    snapshotRulesKey(CHALLENGE_DEFAULT_RULES),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChallengeListFilter>("all");
  const [page, setPage] = useState(1);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizMode, setQuizMode] = useState<"add" | "edit">("add");
  const [quizEditingId, setQuizEditingId] = useState<string | null>(null);
  const [quizInitial, setQuizInitial] = useState(emptyQuizForm());
  const [msOpen, setMsOpen] = useState(false);
  const [msMode, setMsMode] = useState<"add" | "edit">("add");
  const [msEditingId, setMsEditingId] = useState<string | null>(null);
  const [msInitial, setMsInitial] = useState(emptyMilestoneForm());
  const [retryToastId, setRetryToastId] = useState<string | null>(null);
  const { toasts, push, dismiss } = useRedeemToasts();

  const dirty = snapshotRulesKey(rules) !== savedKey;
  const stats = useMemo(
    () => computeChallengeStats(quiz, milestones, rules),
    [quiz, milestones, rules],
  );

  useEffect(() => {
    setAllowed(canAccessChallengeModule());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await fetchChallengeBundle();
      setRules(bundle.rules);
      setQuiz(bundle.quiz);
      setMilestones(bundle.milestones);
      setSavedKey(snapshotRulesKey(bundle.rules));
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load challenge.";
      const id = push("error", CHALLENGE_TOAST_TITLES.loadError, message, {
        actionLabel: "Retry",
        durationMs: 0,
      });
      setRetryToastId(id);
    } finally {
      setLoading(false);
    }
  }, [push]);

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
    try {
      const saved = await saveChallengeBundle({ rules });
      setRules(saved.rules);
      setQuiz(saved.quiz);
      setMilestones(saved.milestones);
      setSavedKey(snapshotRulesKey(saved.rules));
      push(
        "success",
        CHALLENGE_TOAST_TITLES.success,
        "Rules live — Android picks this up on next sync.",
      );
    } catch (e) {
      push(
        "error",
        CHALLENGE_TOAST_TITLES.error,
        e instanceof Error ? e.message : "Save failed.",
      );
    }
  }

  async function saveQuiz(values: QuizFormValues): Promise<string | null> {
    return persistQuiz(values, quizMode, quiz, quizEditingId, setQuiz, push);
  }

  async function saveMilestone(
    values: MilestoneFormValues,
  ): Promise<string | null> {
    return persistMilestone(
      values,
      msMode,
      milestones,
      msEditingId,
      setMilestones,
      push,
    );
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
        onReset={() => {
          void load().then(() =>
            push("success", CHALLENGE_TOAST_TITLES.success, "Reverted to last saved rules."),
          );
        }}
        onAddQuiz={() => {
          if (quiz.length >= 1500) {
            push("error", CHALLENGE_TOAST_TITLES.error, "Quiz bank is full (max 1500).");
            return;
          }
          setTab("quiz");
          setQuizMode("add");
          setQuizEditingId(null);
          setQuizInitial(emptyQuizForm());
          setQuizOpen(true);
        }}
        onAddMilestone={() => {
          setTab("milestones");
          setMsMode("add");
          setMsEditingId(null);
          setMsInitial(emptyMilestoneForm());
          setMsOpen(true);
        }}
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
        }}
      />
      {loading ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-400">
          Loading live challenge config…
        </p>
      ) : null}
      {!loading && tab === "rules" ? (
        <>
          <ChallengeRulesPanel rules={rules} onChange={setRules} />
          <ChallengeQuizTimingCard rules={rules} onChange={setRules} />
          <ChallengeQuizCoinsCard rules={rules} onChange={setRules} />
        </>
      ) : null}
      {!loading && (tab === "quiz" || tab === "milestones") ? (
        <ChallengeBankSection
          tab={tab}
          query={query}
          filter={filter}
          page={page}
          quiz={quiz}
          quizFiltered={quizFiltered}
          milestones={milestones}
          msFiltered={msFiltered}
          pagedQuiz={paged as QuizQuestionRow[]}
          pagedMs={paged as MilestoneRow[]}
          onQuery={setQuery}
          onFilter={setFilter}
          onPage={setPage}
          onAddQuiz={() => {
            setQuizMode("add");
            setQuizEditingId(null);
            setQuizInitial(emptyQuizForm());
            setQuizOpen(true);
          }}
          onAddMilestone={() => {
            setMsMode("add");
            setMsEditingId(null);
            setMsInitial(emptyMilestoneForm());
            setMsOpen(true);
          }}
          onEditQuiz={(id) => {
            const row = quiz.find((r) => r.id === id);
            if (!row) return;
            setQuizMode("edit");
            setQuizEditingId(id);
            setQuizInitial(quizToForm(row));
            setQuizOpen(true);
          }}
          onEditMilestone={(id) => {
            const row = milestones.find((r) => r.id === id);
            if (!row) return;
            setMsMode("edit");
            setMsEditingId(id);
            setMsInitial(milestoneToForm(row));
            setMsOpen(true);
          }}
          onToggleQuiz={(id) => {
            void toggleQuizRow(id, quiz, setQuiz, push);
          }}
          onDeleteQuiz={(id) => {
            void deleteQuizRow(id, quiz, setQuiz, push);
          }}
          onToggleMilestone={(id) => {
            void toggleMilestoneRow(id, milestones, setMilestones, push);
          }}
          onDeleteMilestone={(id) => {
            void deleteMilestoneRow(id, milestones, setMilestones, push);
          }}
        />
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
      <RedeemToastHost
        toasts={toasts}
        onDismiss={dismiss}
        onAction={(id) => {
          if (id === retryToastId) {
            dismiss(id);
            setRetryToastId(null);
            void load();
          }
        }}
      />
    </section>
  );
}
