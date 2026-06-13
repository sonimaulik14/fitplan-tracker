import { vajraIcon } from "@/lib/brand-icon";

export const dynamic = "force-static";

// Maskable: full-bleed square (no corner radius) with extra safe-zone padding
// so the OS circle/squircle mask never clips the mark.
export function GET() {
  return vajraIcon(512, { pad: 0.22, radius: 0 });
}
