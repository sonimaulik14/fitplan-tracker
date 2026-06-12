import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlateaus, getProgress } from "@/lib/metrics";
import NavBar from "@/app/components/NavBar";
import CoachChat from "@/app/components/CoachChat";

export const metadata = { title: "Coach" };

export default async function CoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [plateaus, progress] = await Promise.all([
    getPlateaus(user.id),
    getProgress(user.id),
  ]);

  // Suggested openers tailored to where the athlete actually is.
  const starters: string[] = [];
  if (plateaus.length)
    starters.push(`How do I break my ${plateaus[0].name} plateau?`);
  if (progress?.enrolled) {
    starters.push("What should I focus on this week?");
    starters.push("Is my weekly volume enough to grow?");
    starters.push("Should I deload soon?");
  } else {
    starters.push("Which program fits my goal?");
    starters.push("How should a beginner structure a training week?");
  }
  const shown = starters.slice(0, 4);

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-5 pt-5 pb-24 sm:pb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-hi to-accent text-lg shadow-md shadow-accent/25">
            🧠
          </span>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">
              Your Coach
            </h1>
            <p className="text-xs text-muted">
              Personalized to your logged training
            </p>
          </div>
        </div>
        <CoachChat starters={shown} />
      </main>
    </>
  );
}
