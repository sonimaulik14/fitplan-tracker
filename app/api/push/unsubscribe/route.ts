import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let endpoint: string | undefined;
  try {
    endpoint = (await req.json())?.endpoint;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!endpoint) return new Response("Bad request", { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
  return Response.json({ ok: true });
}
