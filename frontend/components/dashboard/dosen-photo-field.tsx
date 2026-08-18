"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type ChangeEvent } from "react";
import { inputClass } from "@/components/ui";

const MAX_DIMENSION = 1600;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

async function compressPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the photo");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Unable to prepare the photo");
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("The prepared photo is still larger than 3 MB");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "dosen-photo"}.jpg`, { type: "image/jpeg" });
}

export default function DosenPhotoField({ initialUrl, onFileChange, disabled = false }: { initialUrl?: string; onFileChange: (file: File | null) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
      const prepared = await compressPhoto(file);
      onFileChange(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (reason) {
      onFileChange(null);
      setError(reason instanceof Error ? reason.message : "Unable to prepare the photo");
      event.target.value = "";
    }
  }

  return <div className="space-y-3"><div className="flex flex-wrap items-start gap-4">{preview ? <img src={preview} alt="Selected dosen profile" className="h-28 w-28 rounded-md border border-black/10 object-cover" /> : <div className="grid h-28 w-28 place-items-center rounded-md border border-dashed border-black/15 bg-[var(--rams-gray-light)] text-center text-xs text-[var(--rams-gray)]">No photo<br />selected</div>}<div className="min-w-[12rem] flex-1"><input type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={disabled} onChange={(event) => void handleChange(event)} className={`${inputClass} file:mr-3 file:border-0 file:bg-[var(--navy)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white`} /><p className="mt-1 text-xs leading-5 text-[var(--rams-gray)]">Choose from Downloads or take a selfie on mobile. Images are resized before upload.</p>{error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}</div></div></div>;
}
