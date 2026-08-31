"use client";

import { useState, type ChangeEvent } from "react";
import { inputClass } from "@/components/ui";

const MAX_DIMENSION = 1600;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

async function compressPhoto(file: File) {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );

  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to prepare the photo");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) {
    throw new Error("Unable to prepare the photo");
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("The prepared photo is still larger than 3 MB");
  }

  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "") || "profile-photo"}.jpg`,
    {
      type: "image/jpeg",
    },
  );
}

async function cropPhoto(file: File, zoom: number) {
  const bitmap = await createImageBitmap(file);
  const targetWidth = 1200;
  const targetHeight = 900;
  const baseWidth = Math.min(bitmap.width, bitmap.height * (4 / 3));
  const baseHeight = baseWidth * (3 / 4);
  const sourceWidth = baseWidth / zoom;
  const sourceHeight = baseHeight / zoom;
  const sourceX = (bitmap.width - sourceWidth) / 2;
  const sourceY = (bitmap.height - sourceHeight) / 2;
  const canvas = document.createElement("canvas");

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Unable to edit the photo");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.84);
  });

  if (!blob) {
    throw new Error("Unable to edit the photo");
  }

  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("The edited photo is still larger than 3 MB");
  }

  return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
}

export default function ProfilePhotoField({
  initialUrl, onFileChange, 
  disabled = false, 
  profileLabel = "profile",
}: {
  initialUrl?: string;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  profileLabel?: string;
}) {
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorPreview, setEditorPreview] = useState("");
  const [zoom, setZoom] = useState(1);
  const [editing, setEditing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file");
      }

      const prepared = await compressPhoto(file);

      setEditorFile(prepared);
      setEditorPreview(URL.createObjectURL(prepared));
      setZoom(1);
      setEditing(true);
    } catch (reason) {
      onFileChange(null);

      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to prepare the photo",
      );

      event.target.value = "";
    }
  }

  async function applyEdit() {
    if (!editorFile) return;

    setApplying(true);
    setError(null);

    try {
      const edited = await cropPhoto(editorFile, zoom);
      onFileChange(edited);
      setPreview(URL.createObjectURL(edited));
      setEditing(false);
      setEditorFile(null);
      setEditorPreview("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to edit the photo",
      );
    } finally {
      setApplying(false);
    }
  }

  function cancelEdit() {
    onFileChange(null);
    setEditing(false);
    setEditorFile(null);
    setEditorPreview("");
    setZoom(1);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        {preview ? (
          <img
            src={preview}
            alt={`Selected ${profileLabel} profile`}
            className="h-28 w-28 rounded-md border border-black/10 object-cover"
          />
        ) : (
          <div className="grid h-28 w-28 place-items-center rounded-md border border-dashed border-black/15 bg-[var(--rams-gray-light)] text-center text-xs text-[var(--rams-gray)]">
            No photo
            <br />
            selected
          </div>
        )}

        <div className="min-w-[12rem] flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            disabled={disabled}
            onChange={(event) => void handleChange(event)}
            className={`${inputClass} file:mr-3 file:border-0 file:bg-[var(--navy)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white`}
          />

          <p className="mt-1 text-xs leading-5 text-[var(--rams-gray)]">
            Choose from Downloads or take a selfie on mobile. You can adjust the
            crop and zoom before upload.
          </p>

          {error && (
            <p className="mt-1 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {editing && editorPreview && (
        <div className="max-w-sm space-y-3 rounded-md border border-black/10 bg-[var(--rams-gray-light)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
            Adjust photo
          </p>

          <div className="aspect-[4/3] overflow-hidden rounded-md bg-black">
            <img
              src={editorPreview}
              alt={`Editing ${profileLabel} profile`}
              className="h-full w-full object-cover transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          <label className="block text-xs font-semibold text-[var(--rams-gray)]">
            Zoom: {zoom.toFixed(1)}×
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--rams-red)]"
              disabled={applying || disabled}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void applyEdit()}
              disabled={applying || disabled}
              className="rounded-md bg-[var(--navy)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {applying ? "Applying…" : "Apply crop"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={applying || disabled}
              className="rounded-md border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
