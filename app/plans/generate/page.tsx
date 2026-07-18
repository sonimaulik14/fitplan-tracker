import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStrengthProfile, getProgress } from "@/lib/metrics";
import { buildSignals } from "@/lib/generator";
import NavBar from "@/app/components/NavBar";
import GeneratorWizard from "@/app/components/GeneratorWizard";

export const metadata = { title: "Generate a program" };

export default async function GeneratePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, progress] = await Promise.all([
    getStrengthProfile(user.id),
    getProgress(user.id),
  ]);
  const signals = buildSignals(
    profile,
    progress
      ? {
          doneWorkByMuscle: progress.doneWorkByMuscle,
          weeksTrained: progress.weeksTrained,
        }
      : null
  );

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-solid py-1.5 pl-2 pr-3.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:border-border-strong transition-colors"
        >
          <ChevronLeft size={16} /> Programs
        </Link>
        <div className="mt-6 mb-6">
          <p className="eyebrow">Program generator</p>
          <h1 className="display-hero text-4xl mt-2">
            Let Vajra write your next block
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed max-w-xl">
            Four questions, one personalized program — built from your training
            history, opened in the builder so you can tweak anything before
            saving. Your current plan is never touched.
          </p>
        </div>
        <GeneratorWizard signals={signals} />
      </main>
    </>
  );
}
