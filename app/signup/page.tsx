import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/app/components/AuthForm";
import AuthShell from "@/app/components/AuthShell";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
