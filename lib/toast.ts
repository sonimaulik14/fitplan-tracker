export type ToastTone = "success" | "error" | "info";

export function toast(message: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("vajra:toast", { detail: { message, tone } })
  );
}
