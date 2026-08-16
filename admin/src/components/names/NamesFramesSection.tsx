"use client";

import { NamesEmptyState } from "./NamesEmptyState";
import { NamesFramesTable } from "./NamesFramesTable";
import { NamesPagination } from "./NamesPagination";
import { NamesToolbar, type NamesFilterKey } from "./NamesToolbar";
import type { NameFrameRow } from "./names-data";

type Props = {
  query: string;
  filter: NamesFilterKey;
  page: number;
  pageSize: number;
  frames: NameFrameRow[];
  filtered: NameFrameRow[];
  paged: NameFrameRow[];
  onQuery: (q: string) => void;
  onFilter: (f: NamesFilterKey) => void;
  onPage: (p: number) => void;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function NamesFramesSection({
  query,
  filter,
  page,
  pageSize,
  frames,
  filtered,
  paged,
  onQuery,
  onFilter,
  onPage,
  onEdit,
  onToggle,
  onDelete,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  return (
    <>
      <NamesToolbar
        query={query}
        filter={filter}
        onQuery={onQuery}
        onFilter={onFilter}
      />
      {frames.length === 0 ? (
        <NamesEmptyState
          title="No frames yet"
          body="Add a prefix/suffix frame pack for Stylish Names."
        />
      ) : filtered.length === 0 ? (
        <NamesEmptyState
          title="No matches"
          body="Try another search or filter."
        />
      ) : (
        <>
          <NamesFramesTable
            rows={paged}
            onEdit={onEdit}
            onToggle={onToggle}
            onDelete={onDelete}
          />
          <NamesPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPage={onPage}
          />
        </>
      )}
    </>
  );
}
