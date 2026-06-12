import Link from "next/link";

// Reusable, motivating empty state — icon badge + copy + optional CTA.
// Use instead of bare "Nothing logged yet" text so first-run screens feel
// intentional and point users at the next action.
export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  compact = false,
  className = "",
}: {
  icon: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "py-8" : "py-12"
      } px-6 ${className}`}
    >
      <div className="grid place-items-center w-14 h-14 rounded-2xl bg-surface-2 border border-border text-2xl mb-4">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="text-sm text-muted mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-5 !px-5">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
