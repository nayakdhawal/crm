// components/StatusBadge.js
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/estimateUtils";

export default function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || "bg-slate-100 text-slate-700";
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
