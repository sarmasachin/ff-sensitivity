"use client";

import { useState } from "react";

const fieldClass =
  "h-8 w-full min-w-0 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10";

const btnClass =
  "h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";

type Props = {
  onCreateType: (input: {
    id: string;
    label: string;
  }) => Promise<string | null>;
  onCreateCadence: (input: {
    id: string;
    label: string;
    claimLimit?: number;
    windowHours?: number;
  }) => Promise<string | null>;
  onTypeCreated: (id: string) => void;
  onCadenceCreated: (id: string) => void;
  onError: (msg: string | null) => void;
};

export function RedeemFormTypeCadence({
  onCreateType,
  onCreateCadence,
  onTypeCreated,
  onCadenceCreated,
  onError,
}: Props) {
  const [newTypeId, setNewTypeId] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [newCadenceId, setNewCadenceId] = useState("");
  const [newCadenceLabel, setNewCadenceLabel] = useState("");
  const [newClaimLimit, setNewClaimLimit] = useState("3");
  const [newWindowHours, setNewWindowHours] = useState("24");
  const [addingCadence, setAddingCadence] = useState(false);

  async function handleAddType() {
    if (addingType) return;
    setAddingType(true);
    onError(null);
    try {
      const id = newTypeId.trim().toUpperCase();
      const err = await onCreateType({
        id,
        label: newTypeLabel.trim(),
      });
      if (err) {
        onError(err);
        return;
      }
      if (id) onTypeCreated(id);
      setNewTypeId("");
      setNewTypeLabel("");
    } finally {
      setAddingType(false);
    }
  }

  async function handleAddCadence() {
    if (addingCadence) return;
    setAddingCadence(true);
    onError(null);
    try {
      const id = newCadenceId.trim().toUpperCase();
      const claimLimit = Number(newClaimLimit);
      const windowHours = Number(newWindowHours);
      const err = await onCreateCadence({
        id,
        label: newCadenceLabel.trim(),
        claimLimit: Number.isFinite(claimLimit) ? claimLimit : undefined,
        windowHours: Number.isFinite(windowHours) ? windowHours : undefined,
      });
      if (err) {
        onError(err);
        return;
      }
      if (id) onCadenceCreated(id);
      setNewCadenceId("");
      setNewCadenceLabel("");
      setNewClaimLimit("3");
      setNewWindowHours("24");
    } finally {
      setAddingCadence(false);
    }
  }

  return (
    <div className="mt-2.5 w-full min-w-0 space-y-2 overflow-x-hidden">
      <div className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2.5">
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className={fieldClass}
            value={newTypeId}
            onChange={(e) => setNewTypeId(e.target.value)}
            placeholder="NEW_TYPE id"
          />
          <input
            className={fieldClass}
            value={newTypeLabel}
            onChange={(e) => setNewTypeLabel(e.target.value)}
            placeholder="Type label"
          />
        </div>
        <button
          type="button"
          disabled={addingType}
          onClick={() => {
            void handleAddType();
          }}
          className={btnClass}
        >
          {addingType ? "Adding…" : "Add type"}
        </button>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2.5">
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className={fieldClass}
            value={newCadenceId}
            onChange={(e) => setNewCadenceId(e.target.value)}
            placeholder="NEW_CADENCE id"
          />
          <input
            className={fieldClass}
            value={newCadenceLabel}
            onChange={(e) => setNewCadenceLabel(e.target.value)}
            placeholder="Cadence label"
          />
          <input
            className={fieldClass}
            value={newClaimLimit}
            onChange={(e) => setNewClaimLimit(e.target.value)}
            placeholder="Claim limit"
            title="Claims per window"
          />
          <input
            className={fieldClass}
            value={newWindowHours}
            onChange={(e) => setNewWindowHours(e.target.value)}
            placeholder="Window hours"
            title="Window hours"
          />
        </div>
        <button
          type="button"
          disabled={addingCadence}
          onClick={() => {
            void handleAddCadence();
          }}
          className={btnClass}
        >
          {addingCadence ? "Adding…" : "Add cadence"}
        </button>
      </div>
    </div>
  );
}
