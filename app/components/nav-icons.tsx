// Navigation glyphs shared by the desktop top bar and the mobile tab bar.

export function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ListIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FireIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3c.5 3-2 4.5-2 7a2 2 0 1 0 4 0c0-.6-.2-1.2-.5-1.7C16 10 18 12.5 18 15a6 6 0 1 1-12 0c0-3.5 3-5.5 4-9 .6.8 1.4 1.2 2-3Z"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20V10M10 20V4M16 20v-7M22 20H2"
        stroke="currentColor"
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DumbbellIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
