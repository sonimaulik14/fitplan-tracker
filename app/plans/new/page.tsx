import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavBar from "@/app/components/NavBar";
import PlanBuilder from "@/app/components/PlanBuilder";

export const metadata = { title: "Build a program" };

export default async function NewPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8 pb-44 md:pb-32">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          ← Back to programs
        </Link>
        <div className="mt-6 mb-8 animate-fade-up">
          <p className="eyebrow">Program builder</p>
          <h1 className="display-hero text-4xl sm:text-5xl mt-2">Build your own</h1>
          <p className="text-sm text-muted mt-3 max-w-xl leading-relaxed">
            Design your training week by week — every week has 7 days, and any day
            can be a rest day. You can duplicate a finished week to fill the rest.
          </p>
        </div>
        <PlanBuilder />
      </main>
    </>
  );
}
