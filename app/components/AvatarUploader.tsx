"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAvatarAction, removeAvatarAction } from "@/lib/actions";
import { toast } from "@/lib/toast";
import Avatar from "./Avatar";

async function toResizedDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function AvatarUploader({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const dataUrl = await toResizedDataUrl(file);
      start(async () => {
        const res = await setAvatarAction(dataUrl);
        if (res.ok) {
          toast("Photo updated");
          router.refresh();
        } else setMsg(res.error ?? "Error");
      });
    } catch {
      setMsg("Could not read that image.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () =>
    start(async () => {
      await removeAvatarAction();
      router.refresh();
    });

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={avatarUrl} size={64} />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <div className="flex gap-2">
          <button
            className="btn-ghost !py-2"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            {pending ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
          </button>
          {avatarUrl && (
            <button
              className="btn-ghost !py-2"
              onClick={remove}
              disabled={pending}
            >
              Remove
            </button>
          )}
        </div>
        {msg && <span className="text-xs text-red-300">{msg}</span>}
      </div>
    </div>
  );
}
