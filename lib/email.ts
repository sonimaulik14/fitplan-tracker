import "server-only";

// Lightweight email sender via Resend's REST API (no SDK). Returns true on a
// sent email, false if email isn't configured or the send failed — callers
// fall back gracefully (e.g. log the link server-side) so the app still works
// without an email provider.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Must be a verified sender on your Resend account. "onboarding@resend.dev"
// works out of the box for testing (delivers only to your own account email).
const FROM = process.env.EMAIL_FROM || "Vajra <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, ...opts }),
    });
    if (!res.ok) {
      console.error("[email] Resend send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] Resend send error:", e);
    return false;
  }
}

// On-brand password-reset email. Light, inline-styled HTML (email clients need
// inline CSS) + a plain-text fallback.
export function passwordResetEmail(resetUrl: string): {
  subject: string;
  html: string;
  text: string;
} {
  const accent = "#2456e6";
  return {
    subject: "Reset your Vajra password",
    text: [
      "Reset your Vajra password",
      "",
      "We received a request to reset your password. Open the link below to choose a new one — it expires in 1 hour:",
      "",
      resetUrl,
      "",
      "If you didn't request this, you can safely ignore this email — your password won't change.",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#f1f3f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3f8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;border:1px solid #e6e9f0;overflow:hidden;">
        <tr><td style="padding:28px 28px 0;">
          <span style="display:inline-flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:${accent};"></span>
            <span style="font:700 18px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161a24;">Vajra</span>
          </span>
        </td></tr>
        <tr><td style="padding:20px 28px 0;">
          <h1 style="margin:0;font:800 22px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#161a24;letter-spacing:-0.02em;">Reset your password</h1>
          <p style="margin:12px 0 0;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#515a6b;">
            We received a request to reset your password. Tap the button to choose a new one. This link expires in <strong style="color:#161a24;">1 hour</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <a href="${resetUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font:600 15px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:12px 22px;border-radius:12px;">Reset password</a>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <p style="margin:0;font:400 13px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#8a91a1;">
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
          <p style="margin:14px 0 0;font:400 12px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#a8aebb;word-break:break-all;">
            Or paste this link: ${resetUrl}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}
