import AuthShell from "@/app/components/AuthShell";
import ResetForm from "@/app/components/ResetForm";

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell>
      <ResetForm token={token} />
    </AuthShell>
  );
}
