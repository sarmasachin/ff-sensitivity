type Props = {
  title: string;
  description: string;
};

export function OpsEmptyState({ title, description }: Props) {
  return (
    <section className="max-w-2xl">
      <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#0f172a]">
        {title}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#64748b]">
        {description}
      </p>
    </section>
  );
}
