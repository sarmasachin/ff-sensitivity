"use client";

import { ScratchCapabilities } from "./ScratchCapabilities";
import { ScratchEmptyState } from "./ScratchEmptyState";
import { ScratchPagination } from "./ScratchPagination";
import { ScratchTable } from "./ScratchTable";
import { ScratchToolbar, type ScratchFilterKey } from "./ScratchToolbar";
import type { ScratchPrizeRow } from "./scratch-data";

type Props = {
  query: string;
  filter: ScratchFilterKey;
  page: number;
  pageSize: number;
  rows: ScratchPrizeRow[];
  filtered: ScratchPrizeRow[];
  paged: ScratchPrizeRow[];
  onQuery: (q: string) => void;
  onFilter: (f: ScratchFilterKey) => void;
  onPage: (p: number) => void;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ScratchPrizesSection({
  query,
  filter,
  page,
  pageSize,
  rows,
  filtered,
  paged,
  onQuery,
  onFilter,
  onPage,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: Props) {
  return (
    <>
      <ScratchToolbar
        query={query}
        filter={filter}
        onQuery={onQuery}
        onFilter={onFilter}
        onAdd={onAdd}
      />
      {rows.length === 0 ? (
        <ScratchEmptyState kind="inventory" onAdd={onAdd} />
      ) : filtered.length === 0 ? (
        <ScratchEmptyState
          kind="filter"
          onClearFilter={() => {
            onFilter("all");
            onQuery("");
          }}
        />
      ) : (
        <ScratchTable
          rows={paged}
          notice={null}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          footer={
            <ScratchPagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPage={onPage}
            />
          }
        />
      )}
      <ScratchCapabilities />
    </>
  );
}
