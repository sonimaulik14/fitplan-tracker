"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; error?: string };

// Sentinel the server prefixes to a mid-stream error (see /api/coach).
const ERR_MARK = "[[FITPLAN_ERROR]]";

export default function CoachChat({ starters }: { starters: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // keep the latest message in view as tokens stream in
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...messages, { role: "user" as const, content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const setLast = (content: string, error?: string) =>
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content, error };
        return c;
      });

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        setLast(t || "Something went wrong. Please try again.");
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const i = acc.indexOf(ERR_MARK);
        if (i >= 0) setLast(acc.slice(0, i), acc.slice(i + ERR_MARK.length));
        else setLast(acc);
      }
    } catch {
      setLast("Network hiccup — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-13rem)] min-h-[24rem]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-1 space-y-4 pb-2"
      >
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-up">
            <span className="grid place-items-center w-14 h-14 rounded-2xl brand-bg text-white shadow-lg shadow-accent/25">
              <Sparkles size={26} strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="font-display font-bold text-xl mt-4">
              Ask your coach
            </h2>
            <p className="text-sm text-muted mt-1 max-w-sm">
              I can see your program, volume, PRs and stalled lifts. Ask me
              anything about your training.
            </p>
            <div className="mt-5 flex flex-col gap-2 w-full max-w-md">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm rounded-xl border border-border bg-surface-2 hover:border-border-strong hover:bg-surface px-4 py-3 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} msg={m} busy={busy} last={i === messages.length - 1} />)
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-surface-2 p-2 focus-within:border-border-strong transition-colors"
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask about a plateau, your volume, a deload…"
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none max-h-32 placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="btn-primary shrink-0 !px-3 !py-2 disabled:opacity-40"
        >
          {busy ? <Spinner /> : <SendIcon />}
        </button>
      </form>
      <p className="text-[11px] text-muted text-center mt-2">
        Coaching guidance from your logged data — not medical advice.
      </p>
    </div>
  );
}

function Bubble({ msg, busy, last }: { msg: Msg; busy: boolean; last: boolean }) {
  const isUser = msg.role === "user";
  const thinking = !isUser && last && busy && msg.content === "";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent/15 border border-accent/25 px-4 py-2.5 text-sm"
            : "max-w-[90%] rounded-2xl rounded-bl-md bg-surface-2 border border-border px-4 py-3 text-sm leading-relaxed"
        }
      >
        {thinking ? (
          <span className="inline-flex gap-1 py-1">
            <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
          </span>
        ) : isUser ? (
          msg.content
        ) : (
          <>
            {msg.content && <Markdown text={msg.content} />}
            {msg.error && (
              <p
                className={`text-xs text-danger ${msg.content ? "mt-2 pt-2 border-t border-border" : ""}`}
              >
                ⚠ {msg.error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Minimal, safe markdown: paragraphs, "-"/"*" bullets, numbered lists, and
// **bold** inline. Builds React nodes (no dangerouslySetInnerHTML).
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 my-1.5">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (m) {
      list.push(m[1]);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push(
        <p key={key++} className="my-1.5 first:mt-0 last:mb-0">
          {inline(line)}
        </p>
      );
    }
  }
  flush();
  return <>{blocks}</>;
}

function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
