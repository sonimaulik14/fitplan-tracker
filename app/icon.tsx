import { vajraIcon } from "@/lib/brand-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return vajraIcon(32, { pad: 0.08, radius: 7 });
}
