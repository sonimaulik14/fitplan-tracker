import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStrengthProfile } from "@/lib/metrics";
import { weightNum, LIFT_CATEGORIES, type Unit, type LiftKey } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import TestWizard from "@/app/components/TestWizard";

export const metadata = { title: "1RM test" };

export default async function TestDayPage({
  params,
}: {
  params: Promise<{ lift: string }>;
}) {
  const { lift } = await params;
  const cat = LIFT_CATEGORIES.find((c) => c.key === lift);
  if (!cat) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;

  const p = await getStrengthProfile(user.id);
  const current = p.lifts.find((l) => l.key === cat.key);

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <Link
          href="/strength"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-solid py-1.5 pl-2 pr-3.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:border-border-strong transition-colors"
        >
          <ChevronLeft size={16} /> Strength profile
        </Link>
        <div className="mt-6 mb-6">
          <p className="eyebrow">1RM test day</p>
          <h1 className="display-hero text-4xl sm:text-5xl mt-2">{cat.label}</h1>
        </div>
        <TestWizard
          lift={cat.key as LiftKey}
          label={cat.label}
          bestE1RM={
            current?.e1RMkg != null ? weightNum(current.e1RMkg, unit) : null
          }
          latestBwKg={p.latestBwKg}
          unit={unit}
        />
      </main>
    </>
  );
}
