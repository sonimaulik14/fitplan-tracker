import "server-only";
import crypto from "crypto";

/**
 * Password-reset tokens are stored hashed so a leaked DB row can't be used
 * directly. Shared by the reset actions and the /reset/[token] page so both
 * sides always agree on the hash.
 */
export const hashResetToken = (raw: string) =>
  crypto.createHash("sha256").update(raw).digest("hex");
