"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/lib/actions";
import PasswordInput from "./PasswordInput";
import VajraMark from "./VajraMark";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPasswordAction,
    undefined
  );

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-6">
        <span className="grid place-items-center w-9 h-9 rounded-lg brand-bg">
          <VajraMark size={26} />
        </span>
        <span className="font-display font-bold text-xl">
          Vajra
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
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5">
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
