import { vajraIcon } from "@/lib/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return vajraIcon(180, { pad: 0.2, radius: 40 });
}
