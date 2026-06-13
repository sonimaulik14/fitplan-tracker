"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions";
import VajraMark from "./VajraMark";

export default function ForgotForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    undefined
  );

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-6">
        <span className="grid place-items-center w-9 h-9 rounded-xl brand-bg shadow-lg shadow-accent/30">
          <VajraMark size={22} />
        </span>
        <span className="font-display font-bold text-xl">
          Vajra
        </span>
      </div>
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="text-muted text-sm mt-1.5">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {state?.sent ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-accent-2/30 bg-accent-2/10 px-4 py-3 text-sm">
            If an account exists for that email, a reset link is on its way.
          </div>
          {state.link && (
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
              <div className="text-muted text-xs mb-1">
                No email provider configured yet — use this link:
              </div>
              <Link href={state.link} className="text-accent font-semibold break-all">
                {state.link}
              </Link>
            </div>
          )}
          <Link href="/login" className="text-sm text-accent font-semibold">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4 mt-6">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" className="btn-primary w-full !py-3" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <Link
            href="/login"
            className="block text-center text-sm text-muted hover:text-foreground"
          >
            ← Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
