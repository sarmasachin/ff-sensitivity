type Props = {
  title: string;
  body: string;
};

export function PushEmptyState({ title, body }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center">
      <p className="text-[15px] font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-slate-500">
        {body}
      </p>
    </div>
  );
}
