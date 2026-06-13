import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { buildCoachContext } from "@/lib/coach-context";
import { rateLimit } from "@/lib/rate-limit";
import type { Unit } from "@/lib/ui";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

type ChatMsg = { role: "user" | "assistant"; content: string };

const SYSTEM_RULES = `You are Vajra's in-app strength & hypertrophy coach.

You are talking to one athlete inside their training app. Below their question you are given their REAL logged data — program, current week, adherence, streak, per-muscle volume, PRs, and any stalled lifts. Ground every answer in that data; reference their actual numbers, lifts, and program style rather than generic advice.

Guidelines:
- Be specific and actionable. When you suggest loads, give concrete numbers in THEIR units, rounded to a sensible plate jump (2.5 kg / 5 lb).
- Be concise — a few short paragraphs or tight bullet points. No filler, no long preambles.
- Coach like a knowledgeable, encouraging human: direct, warm, no hype.
- Lean on evidence-based hypertrophy/strength principles (progressive overload, MEV–MRV volume landmarks, RPE/RIR autoregulation, deloads, rep-range variation).
- If a lift is stalled, give a clear plan (deload %, rep-range change, or variation swap) using their numbers.
- Only answer training, programming, recovery, and general nutrition questions. For anything medical, pain/injury, or PED-related, briefly recommend a qualified professional instead.
- Never invent data you weren't given. If something isn't in their stats, say so and ask.
- Use plain text with simple markdown (bold, "-" bullets). No headings larger than bold labels.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "The AI coach isn't switched on yet — an ANTHROPIC_API_KEY needs to be set in the environment.",
      { status: 503 }
    );
  }

  if (!(await rateLimit("coach", 20, 60_000)))
    return new Response("You're asking fast — give the coach a few seconds.", {
      status: 429,
    });

  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m): m is ChatMsg =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length || messages[messages.length - 1].role !== "user")
    return new Response("Bad request", { status: 400 });

  const unit: Unit = user.unit === "lb" ? "lb" : "kg";
  const context = await buildCoachContext(user.id, {
    name: user.name,
    unit,
    goal: user.goal,
    goalWeightKg: user.goalWeightKg,
    calorieGoal: user.calorieGoal,
    proteinGoal: user.proteinGoal,
  });

  const system = `${SYSTEM_RULES}\n\n--- ATHLETE DATA (live) ---\n${context}`;

  const anthropic = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system,
          messages,
        });
        ms.on("text", (t) => controller.enqueue(encoder.encode(t)));
        await ms.finalMessage();
      } catch (err) {
        console.error("coach stream error", err);
        // Sentinel so the client can render this as an error (not as answer
        // content) even when the failure happens mid-stream.
        controller.enqueue(
          encoder.encode(
            "[[FITPLAN_ERROR]]The coach hit a snag answering that. Please try again."
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
