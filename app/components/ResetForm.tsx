"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/lib/actions";
import PasswordInput from "./PasswordInput";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPasswordAction,
    undefined
  );

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-6">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-hi to-accent text-[#ffffff] font-black text-lg shadow-lg shadow-accent/30">
          F
        </span>
        <span className="font-display font-bold text-xl">
          Fit<span className="gradient-text">Plan</span>
        </span>
      </div>
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="text-muted text-sm mt-1.5">
        Choose a new password for your account.
      </p>

      <form action={formAction} className="space-y-4 mt-6">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="next">
            New password
          </label>
          <PasswordInput id="next" name="next" autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full !py-3" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
