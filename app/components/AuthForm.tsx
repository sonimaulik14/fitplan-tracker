"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction, type AuthState } from "@/lib/actions";
import PasswordInput from "./PasswordInput";
import VajraMark from "./VajraMark";

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
          <span className="grid place-items-center w-9 h-9 rounded-lg brand-bg">
            <VajraMark size={26} />
          </span>
          <span className="font-display font-bold text-xl tracking-tight">
            Vajra
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

        {mode === "login" && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted hover:text-foreground transition-colors">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="peer sr-only"
              />
              <span className="grid place-items-center w-4 h-4 rounded border border-border-strong bg-surface-2 transition-colors peer-checked:bg-accent peer-checked:border-accent peer-checked:[&>svg]:opacity-100">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-accent-ink opacity-0 transition-opacity"
                >
                  <path
                    d="M5 12.5 10 17l9-10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Keep me signed in
            </label>
            <Link
              href="/forgot"
              className="text-sm text-muted hover:text-foreground shrink-0"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {state?.error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5">
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
      </form>

      {mode === "login" && process.env.NODE_ENV !== "production" && (
        <div className="mt-4 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-xs text-muted">
          Demo login —{" "}
          <span className="text-foreground font-semibold">demo@vajra.fit</span> /{" "}
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
