// Vajra brand mark — a gada (Hanuman's mace), the traditional Indian symbol
// and tool of strength. Drawn head-down (bulb at the bottom). White on the
// accent tile; reads from a 16px favicon up to the install icon.
export default function VajraMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* flared grip (top) */}
      <rect x="8.7" y="2.6" width="6.6" height="3" rx="1.5" fill="#ffffff" />
      {/* handle */}
      <rect x="10.7" y="5.2" width="2.6" height="7.2" rx="1.3" fill="#ffffff" />
      {/* mace head — the dominant bulb (bottom) */}
      <circle cx="12" cy="16.4" r="5.1" fill="#ffffff" />
      {/* finial tip */}
      <circle cx="12" cy="22" r="1.4" fill="#ffffff" />
    </svg>
  );
}
