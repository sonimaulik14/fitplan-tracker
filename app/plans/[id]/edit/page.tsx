import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlanDraftAction } from "@/lib/actions/plans";
import NavBar from "@/app/components/NavBar";
import PlanBuilder from "@/app/components/PlanBuilder";

export const metadata = { title: "Edit program" };

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const res = await getPlanDraftAction(id);
  if (!res.ok || !res.draft) redirect("/plans");

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
          <h1 className="display-hero text-4xl sm:text-5xl mt-2">Edit program</h1>
        </div>
        <PlanBuilder initial={res.draft} locked={res.locked} />
      </main>
    </>
  );
}
