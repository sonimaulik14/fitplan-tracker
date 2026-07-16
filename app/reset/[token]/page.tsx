import Link from "next/link";
import AuthShell from "@/app/components/AuthShell";
import ResetForm from "@/app/components/ResetForm";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/tokens";

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate up front so an expired link gets a clear dead-end instead of a
  // form that fails on submit. resetPasswordAction re-checks — this is UX,
  // that is security.
  const row = token
    ? await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashResetToken(token) },
      })
    : null;
  const valid = !!row && row.expiresAt > new Date();

  return (
    <AuthShell>
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="text-2xl font-bold">This link has expired</h1>
          <p className="text-muted text-sm mt-1.5">
            Reset links are valid for one hour and can only be used once.
            Request a new one and try again.
          </p>
          <Link href="/forgot" className="btn-primary mt-6 inline-flex">
            Request a new link
          </Link>
          <p className="text-muted text-sm mt-4">
            Remembered your password?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
