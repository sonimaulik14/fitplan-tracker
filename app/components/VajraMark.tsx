// Vajra brand mark — a faceted diamond (vajra = the indestructible diamond).
// White gem with subtle cut facets; sits on an accent tile. Scales cleanly
// from a 16px favicon up to the install icon.
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
      <path d="M7 3.5h10L20.8 9 12 21 3.2 9z" fill="#ffffff" />
      <path
        d="M3.2 9h17.6M7 3.5 9.6 9 12 21 14.4 9 17 3.5"
        stroke="#0a0c12"
        strokeOpacity="0.22"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
