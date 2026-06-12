"use client";

import { useEffect, useState, useTransition } from "react";
import { updateRemindersAction } from "@/lib/actions";
import { toast } from "@/lib/toast";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

type PushState =
  | "loading"
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "off"
  | "on";

export default function RemindersSettings({
  remindersOn: initialOn,
  reminderTime: initialTime,
  trainingDays: initialDays,
}: {
  remindersOn: boolean;
  reminderTime: string;
  trainingDays: number[];
}) {
  const [on, setOn] = useState(initialOn);
  const [time, setTime] = useState(initialTime || "18:00");
  const [days, setDays] = useState<number[]>(initialDays);
  const [push, setPush] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [saving, startSave] = useTransition();

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Determine current push state for this device.
  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        typeof Notification === "undefined"
      ) {
        setPush("unsupported");
        return;
      }
      if (!vapid) return setPush("unconfigured");
      if (Notification.permission === "denied") return setPush("denied");
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setPush(sub ? "on" : "off");
      } catch {
        setPush("off");
      }
    })();
  }, [vapid]);

  const toggleDay = (d: number) =>
    setDays((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)
    );

  const save = () =>
    startSave(async () => {
      const res = await updateRemindersAction({
        remindersOn: on,
        reminderTime: time,
        trainingDays: days,
        timezone: tz(),
      });
      if (res.ok) toast("Reminder settings saved");
    });

  async function enablePush() {
    if (!vapid) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPush(perm === "denied" ? "denied" : "off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), timezone: tz() }),
      });
      if (!r.ok) throw new Error();
      setPush("on");
      if (!on) setOn(true);
      toast("Notifications enabled on this device 🔔");
    } catch {
      toast("Couldn't enable notifications here");
      setPush("off");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPush("off");
      toast("Notifications off for this device");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      toast(r.ok ? "Sent — check your notifications" : await r.text());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Master toggle */}
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span>
          <span className="font-semibold text-sm">Workout reminders</span>
          <span className="block text-xs text-muted">
            A nudge on your training days if you haven&apos;t logged yet.
          </span>
        </span>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className="sr-only peer"
        />
        <span className="relative w-11 h-6 rounded-full bg-surface-2 border border-border peer-checked:bg-accent peer-checked:border-accent transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
      </label>

      {on && (
        <>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Remind me at</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input !w-auto !py-1.5"
            />
          </div>

          <div>
            <span className="text-sm font-medium">On these days</span>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {DAYS.map((d, i) => {
                const active = days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`w-10 h-9 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-accent/15 border-accent/45 text-accent"
                        : "bg-surface-2 border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {d[0]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              No days selected = remind every day.
            </p>
          </div>
        </>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="btn-primary !py-2 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save reminders"}
      </button>

      {/* Device push status */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-semibold mb-1">This device</div>
        <DeviceRow
          state={push}
          busy={busy}
          onEnable={enablePush}
          onDisable={disablePush}
          onTest={sendTest}
        />
      </div>
    </div>
  );
}

function DeviceRow({
  state,
  busy,
  onEnable,
  onDisable,
  onTest,
}: {
  state: PushState;
  busy: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onTest: () => void;
}) {
  if (state === "loading")
    return <p className="text-xs text-muted">Checking…</p>;
  if (state === "unsupported")
    return (
      <p className="text-xs text-muted">
        This browser can&apos;t do push notifications. On iPhone, add FitPlan to
        your Home Screen first, then enable them from the installed app.
      </p>
    );
  if (state === "unconfigured")
    return (
      <p className="text-xs text-muted">
        Push isn&apos;t configured on the server yet (missing VAPID keys).
      </p>
    );
  if (state === "denied")
    return (
      <p className="text-xs text-muted">
        Notifications are blocked in your browser settings — allow them for this
        site, then refresh.
      </p>
    );
  if (state === "off")
    return (
      <button
        onClick={onEnable}
        disabled={busy}
        className="btn-ghost !py-2 text-sm disabled:opacity-50"
      >
        🔔 Enable notifications on this device
      </button>
    );
  // on
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="chip text-accent-2 border-accent-2/30 bg-accent-2/10">
        ✓ Enabled here
      </span>
      <button
        onClick={onTest}
        disabled={busy}
        className="btn-ghost !py-1.5 !px-3 text-xs disabled:opacity-50"
      >
        Send test
      </button>
      <button
        onClick={onDisable}
        disabled={busy}
        className="text-xs text-muted hover:text-foreground"
      >
        Turn off here
      </button>
    </div>
  );
}
