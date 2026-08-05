type Props = {
  query: string;
};

export function UsersEmptyState({ query }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-slate-900">No users found</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-500">
        {query.trim()
          ? `Nothing matched “${query.trim()}”. Clear search or change the status filter.`
          : "No Google-signed accounts in this filter. Demo rows will be replaced by Nest User table."}
      </p>
    </div>
  );
}
