// Shared sync helpers for the server-action modules. Deliberately NOT a
// "use server" file — those may only export async functions, so sync helpers
// used by more than one action module live here.

// Only accept raster image data URLs. Rejects SVG (which can carry inline
// script) and anything that isn't a base64 PNG/JPEG/WebP/GIF.
export const isSafeImageDataUrl = (s: string) =>
  /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s);
