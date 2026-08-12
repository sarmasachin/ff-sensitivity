import type { ReactNode } from "react";
import type { ShopListRow } from "./shop-data";
import { IconEdit, IconTrash, actionBtn } from "@/components/redeem/RedeemActionIcons";

type Props = {
  rows: ShopListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string) => void;
};

function CategoryPill({
  category,
  label,
}: {
  category: string;
  label?: string;
}) {
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
      {label || category}
    </span>
  );
}

export function ShopTable({
  rows,
  notice,
  footer,
  onEdit,
  onDelete,
  onToggle,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-900">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Tag</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Buy</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-medium text-[#0f172a]">{row.title}</p>
                  <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-slate-500">
                    {row.subtitle}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{row.id}</p>
                </td>
                <td className="px-4 py-3.5">
                  <CategoryPill
                    category={row.category}
                    label={row.categoryLabel}
                  />
                </td>
                <td className="px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap text-amber-700 tabular-nums">
                  {row.priceCoins.toLocaleString()} coins
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    {row.rewardTag}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-600">
                  {row.stockLimit == null ? "∞" : row.stockLimit}
                </td>
                <td className="px-4 py-3.5 text-[12px] text-slate-600">
                  {row.oneTime ? "One-time" : "Repeat"}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onToggle?.(row.id)}
                    className={[
                      "inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 transition-colors",
                      row.enabled
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200/70"
                        : "bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200/70",
                    ].join(" ")}
                    title={row.enabled ? "Disable in app" : "Enable in app"}
                  >
                    {row.enabled ? "Live" : "Off"}
                  </button>
                </td>
                <td className="px-3 py-3.5 whitespace-nowrap">
                  <div className="flex flex-nowrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit?.(row.id)}
                      className={actionBtn.edit}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(row.id)}
                      className={actionBtn.delete}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
