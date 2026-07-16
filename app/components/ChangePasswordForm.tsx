"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthState } from "@/lib/actions";
import PasswordInput from "./PasswordInput";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    changePasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <div>
        <label className="label" htmlFor="current">
          Current password
        </label>
        <PasswordInput
          id="current"
          name="current"
          autoComplete="current-password"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="next">
            New password
          </label>
          <PasswordInput id="next" name="next" autoComplete="new-password" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirm new
          </label>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-success bg-success/10 border border-success/30 rounded-lg px-3 py-2.5">
          Password updated ✓
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
