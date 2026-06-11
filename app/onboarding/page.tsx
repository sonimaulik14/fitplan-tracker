import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import OnboardingForm from "@/app/components/OnboardingForm";
import type { Unit } from "@/lib/ui";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trainingDays = (user.trainingDays ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => !Number.isNaN(n));

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <OnboardingForm
        edit={!!user.onboardedAt}
        initial={{
          goal: user.goal ?? "",
          unit: (user.unit as Unit) ?? "kg",
          trainingDays,
          reminderTime: user.reminderTime ?? "18:00",
          remindersOn: user.remindersOn ?? false,
        }}
      />
    </main>
  );
}
