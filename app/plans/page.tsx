import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllPlans, getActiveEnrollment } from "@/lib/metrics";
import { resetProgramAction } from "@/lib/actions";
import NavBar from "@/app/components/NavBar";
import PlanPicker from "@/app/components/PlanPicker";
import DangerButton from "@/app/components/DangerButton";

export const metadata = { title: "Programs" };

export default async function PlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [plans, active] = await Promise.all([
    getAllPlans(),
    getActiveEnrollment(user.id),
  ]);

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          ← Back to dashboard
        </Link>

        {plans.length === 0 ? (
          <div className="card p-8 mt-6 text-center text-muted">
            No programs are loaded yet.
          </div>
        ) : (
          <PlanPicker plans={plans} currentPlanId={active?.planId} />
        )}

        {active && (
          <section className="card p-6 mt-8 flex items-center justify-between gap-4 border-danger/25 animate-fade-up">
            <div>
              <h2 className="font-bold">Reset this program</h2>
              <p className="text-xs text-muted mt-0.5 max-w-sm">
                Clear all your logged workouts and start over from day one. Your
                body metrics, nutrition and photos are kept.
              </p>
            </div>
            <DangerButton
              label="Reset program"
              title="Reset entire program?"
              message="This permanently deletes every workout you've logged in this program and restarts it from day one. Body metrics, nutrition and photos are kept. This can't be undone."
              confirmLabel="Reset program"
              onConfirm={resetProgramAction}
            />
          </section>
        )}
      </main>
    </>
  );
}
