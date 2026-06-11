"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  logBodyweightAction,
  addProgressPhotoAction,
  deleteProgressPhotoAction,
} from "@/lib/actions";
import { unitToKg, type Unit } from "@/lib/ui";
import { toast } from "@/lib/toast";

export function WeighInForm({ unit }: { unit: Unit }) {
  const [w, setW] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const submit = () => {
    const val = Number(w);
    if (!val) return;
    setMsg(null);
    start(async () => {
      const res = await logBodyweightAction(unitToKg(val, unit));
      if (res.ok) {
        setW("");
        toast("Weight logged");
        router.refresh();
      } else setMsg(res.error ?? "Error");
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          placeholder="weight"
          className="input py-2 pr-9 w-32"
          value={w}
          onChange={(e) => setW(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
          {unit}
        </span>
      </div>
      <button className="btn-primary !py-2" onClick={submit} disabled={pending}>
        {pending ? "…" : "Log"}
      </button>
      {msg && <span className="text-sm text-accent-2">{msg}</span>}
    </div>
  );
}

async function fileToResizedDataUrl(file: File, max = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function PhotoUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      start(async () => {
        const res = await addProgressPhotoAction(dataUrl);
        if (res.ok) {
          toast("Photo added");
          router.refresh();
        } else setMsg(res.error ?? "Error");
      });
    } catch {
      setMsg("Could not read that image.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      <button
        className="btn-ghost !py-2"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
      >
        {pending ? "Uploading…" : "+ Add photo"}
      </button>
      {msg && <span className="text-sm text-red-300 ml-2">{msg}</span>}
    </>
  );
}

export function DeletePhotoButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      aria-label="Delete photo"
      className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg bg-black/50 text-white hover:bg-red-500/80 transition-colors"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteProgressPhotoAction(id);
          router.refresh();
        })
      }
    >
      ✕
    </button>
  );
}
