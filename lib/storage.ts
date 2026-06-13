import "server-only";

// Image storage with a graceful fallback. When BLOB_READ_WRITE_TOKEN is set
// (Vercel Blob), the base64 image is uploaded to object storage and a public
// URL is returned — keeping multi-MB blobs out of Postgres rows. Without the
// token it returns the data URL unchanged (current behaviour), so the feature
// activates simply by adding the env var.
//
// Callers must already have validated the data URL (raster image, size-capped).
export async function storeImage(
  dataUrl: string,
  prefix: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return dataUrl;

  const m = dataUrl.match(/^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i);
  if (!m) return dataUrl;
  const mime = m[1];
  const ext = m[2].toLowerCase() === "jpeg" ? "jpg" : m[2].toLowerCase();
  const buffer = Buffer.from(m[3], "base64");

  try {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`${prefix}/${crypto.randomUUID()}.${ext}`, buffer, {
      access: "public",
      token,
      contentType: mime,
    });
    return url;
  } catch {
    // Upload failed — fall back to inline storage so the action still succeeds.
    return dataUrl;
  }
}
