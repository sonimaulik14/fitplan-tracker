import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import NavBar from "@/app/components/NavBar";
import ChangePasswordForm from "@/app/components/ChangePasswordForm";
import AvatarUploader from "@/app/components/AvatarUploader";
import ResetDemoCacheButton from "@/app/components/ResetDemoCacheButton";
import RefreshPhotosButton from "@/app/components/RefreshPhotosButton";
import PhotoHero from "@/app/components/PhotoHero";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-6">
        <PhotoHero
          queryKey="page:account"
          title="Account"
          subtitle="Manage your profile and security."
        />

        {/* Profile */}
        <section className="card p-6 animate-fade-up">
          <h2 className="font-bold mb-4">Profile</h2>
          <div className="mb-4">
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-muted">{user.email}</div>
          </div>
          <AvatarUploader name={user.name} avatarUrl={user.avatarUrl} />
          <Link
            href="/onboarding"
            className="btn-ghost mt-5 !py-2 inline-flex"
          >
            Edit training preferences →
          </Link>
        </section>

        {/* Security */}
        <section className="card p-6 animate-fade-up">
          <h2 className="font-bold mb-1">Change password</h2>
          <p className="text-xs text-muted mb-5">
            Use at least 6 characters.
          </p>
          <ChangePasswordForm />
        </section>

        {/* Appearance */}
        <section className="card p-6 animate-fade-up flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">Photos</h2>
            <p className="text-xs text-muted mt-0.5">
              Pull a fresh set of background &amp; header photos. Add an{" "}
              <code className="text-foreground">UNSPLASH_ACCESS_KEY</code> or{" "}
              <code className="text-foreground">PEXELS_API_KEY</code> in .env for
              pro gym photography.
            </p>
          </div>
          <RefreshPhotosButton />
        </section>

        {/* Advanced */}
        <section className="card p-6 animate-fade-up flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">Exercise demos</h2>
            <p className="text-xs text-muted mt-0.5">
              Clear cached demo clips so they re-fetch — handy if an early match
              looked wrong.
            </p>
          </div>
          <ResetDemoCacheButton />
        </section>

        {/* Sign out */}
        <section className="card p-6 animate-fade-up flex items-center justify-between">
          <div>
            <h2 className="font-bold">Sign out</h2>
            <p className="text-xs text-muted mt-0.5">
              End your session on this device.
            </p>
          </div>
          <form action={logoutAction}>
            <button className="btn-ghost">Sign out</button>
          </form>
        </section>
      </main>
    </>
  );
}
