import { vajraIcon } from "@/lib/brand-icon";

export const dynamic = "force-static";

export function GET() {
  return vajraIcon(192, { pad: 0.16, radius: 42 });
}
