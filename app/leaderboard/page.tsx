import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard, getFollowing } from "@/lib/metrics";
import NavBar from "@/app/components/NavBar";
import LeaderboardView from "@/app/components/LeaderboardView";
import type { Unit } from "@/lib/ui";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [rows, following] = await Promise.all([
    getLeaderboard(),
    getFollowing(user.id),
  ]);

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted mt-1">
            Follow people and see who&apos;s putting in the work.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="card p-8 mt-6 text-center text-muted">
            No one has logged a workout yet — be the first! 💪
          </div>
        ) : (
          <LeaderboardView
            rows={rows}
            myId={user.id}
            following={[...following]}
            unit={user.unit as Unit}
          />
        )}
      </main>
    </>
  );
}
