"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction, type AuthState } from "@/lib/actions";
import PasswordInput from "./PasswordInput";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-6">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-hi to-accent text-[#ffffff] font-black text-lg shadow-lg shadow-accent/30">
            F
          </span>
          <span className="font-display font-bold text-xl tracking-tight">
            Fit<span className="gradient-text">Plan</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-muted text-sm mt-1.5">
          {mode === "login"
            ? "Sign in to keep crushing your plan."
            : "Start your 12-week transformation today."}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" className="input" placeholder="Jane Doe" />
          </div>
        )}
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
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
            {state.error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full !py-3" disabled={pending}>
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        {mode === "login" && (
          <div className="text-right">
            <Link
              href="/forgot"
              className="text-sm text-muted hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        )}
      </form>

      {mode === "login" && (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs text-muted">
          Demo login —{" "}
          <span className="text-foreground font-semibold">demo@fitplan.com</span> /{" "}
          <span className="text-foreground font-semibold">demo123</span>
        </div>
      )}

      <p className="text-sm text-muted mt-6 text-center">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-accent font-semibold hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-semibold hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
