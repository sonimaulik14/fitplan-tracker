import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthShell from "@/app/components/AuthShell";
import ForgotForm from "@/app/components/ForgotForm";

export const metadata = { title: "Reset password" };

export default async function ForgotPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell>
      <ForgotForm />
    </AuthShell>
  );
}
