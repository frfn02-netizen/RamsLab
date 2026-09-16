"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type ChangeEvent } from "react";

import { Button, Field, inputClass } from "@/components/ui";
import type { CropAspectRatio } from "@/types/modules";
import {
  ASPECT_RATIO_MAP,
  clamp,
  type CropSettings,
  getDefaultCropSettings,
  getCropStyles,
} from "@/lib/research-image";

const ASPECT_RATIO_OPTIONS: {
  label: string;
  value: CropAspectRatio;
}[] = [
  { label: "4:3", value: "4/3" },
  { label: "16:9", value: "16/9" },
  { label: "1:1", value: "1/1" },
  { label: "3:4", value: "3/4" },
  { label: "9:16", value: "9/16" },
  { label: "Custom", value: "custom" },
];

export type { CropSettings } from "@/lib/research-image";
export { getDefaultCropSettings, getCropStyles } from "@/lib/research-image";

export default function ImageCropEditor({
  url,
  value,
  onChange,
}: {
  url: string;
  value: CropSettings;
  onChange: (settings: CropSettings) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [customSize, setCustomSize] = useState(
    value.aspectRatio === "custom",
  );
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const isCustom = value.aspectRatio === "custom" && customSize;
  const aspectRatio = isCustom
    ? getCustomRatio(value.customWidth, value.customHeight)
    : ASPECT_RATIO_MAP[value.aspectRatio] ?? 4 / 3;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: value.positionX,
        posY: value.positionY,
      };
    },
    [value.positionX, value.positionY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;

      onChange({
        ...value,
        positionX: clamp(dragStart.current.posX - dx, 0, 100),
        positionY: clamp(dragStart.current.posY - dy, 0, 100),
      });
    },
    [dragging, value, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setDragging(true);
      dragStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        posX: value.positionX,
        posY: value.positionY,
      };
    },
    [value.positionX, value.positionY],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging || !containerRef.current) return;

      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((touch.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((touch.clientY - dragStart.current.y) / rect.height) * 100;

      onChange({
        ...value,
        positionX: clamp(dragStart.current.posX - dx, 0, 100),
        positionY: clamp(dragStart.current.posY - dy, 0, 100),
      });
    },
    [dragging, value, onChange],
  );

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
  }, []);

  function handleAspectRatioSelect(ratio: CropAspectRatio) {
    if (ratio === "custom") {
      setCustomSize(true);
      const w = value.customWidth ?? 1200;
      const h = value.customHeight ?? 900;
      onChange({
        ...value,
        aspectRatio: "custom",
        customWidth: w,
        customHeight: h,
      });
    } else {
      setCustomSize(false);
      onChange({
        ...value,
        aspectRatio: ratio,
        customWidth: undefined,
        customHeight: undefined,
      });
    }
  }

  function handleCustomDimension(dim: "w" | "h", raw: string) {
    const n = raw === "" ? 0 : parseInt(raw, 10);
    if (Number.isNaN(n)) return;

    if (dim === "w") {
      const w = clamp(n, 100, 4000);
      const h = value.customHeight ?? 1000;
      onChange({
        ...value,
        aspectRatio: "custom",
        customWidth: w || undefined,
        customHeight: h,
      });
    } else {
      const w = value.customWidth ?? 1000;
      const h = clamp(n, 100, 4000);
      onChange({
        ...value,
        aspectRatio: "custom",
        customWidth: w,
        customHeight: h || undefined,
      });
    }
  }

  function zoom(delta: number) {
    onChange({
      ...value,
      scale: clamp(value.scale + delta, 0.5, 3),
    });
  }

  function reset() {
    onChange(getDefaultCropSettings());
    setCustomSize(false);
  }

  const styles = getCropStyles(value);

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <div className="flex-1">
        <div
          ref={containerRef}
          className={`relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--rams-gray-light)] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ aspectRatio }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={url}
            alt="Crop preview"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            style={styles}
            draggable={false}
          />

          {showGrid && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="white" strokeWidth="0.3" strokeOpacity="0.5" />
              <line x1="66.66" y1="0" x2="66.66" y2="100" stroke="white" strokeWidth="0.3" strokeOpacity="0.5" />
              <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="white" strokeWidth="0.3" strokeOpacity="0.5" />
              <line x1="0" y1="66.66" x2="100" y2="66.66" stroke="white" strokeWidth="0.3" strokeOpacity="0.5" />
            </svg>
          )}

          <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-white/30" />
        </div>
      </div>

      <div className="flex w-full flex-col gap-5 lg:w-72">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
            Aspect Ratio
          </p>
          <div className="flex flex-wrap gap-1">
            {ASPECT_RATIO_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleAspectRatioSelect(r.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  value.aspectRatio === r.value
                    ? "bg-[var(--rams-red)] text-white"
                    : "border border-black/10 bg-white text-[var(--rams-charcoal)] hover:bg-[var(--rams-gray-light)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {customSize && value.aspectRatio === "custom" && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
              Custom Size
            </p>
            <div className="flex gap-2">
              <Field label="Width (px)">
                <input
                  type="number"
                  min={100}
                  max={4000}
                  step={1}
                  className={inputClass}
                  value={value.customWidth ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleCustomDimension("w", e.target.value)
                  }
                />
              </Field>
              <Field label="Height (px)">
                <input
                  type="number"
                  min={100}
                  max={4000}
                  step={1}
                  className={inputClass}
                  value={value.customHeight ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleCustomDimension("h", e.target.value)
                  }
                />
              </Field>
            </div>
            <p className="text-[10px] text-[var(--rams-gray)]">
              Ratio: {Math.round(value.customWidth ?? 1200)} / {Math.round(value.customHeight ?? 900)} = {(getCustomRatio(value.customWidth, value.customHeight)).toFixed(2)}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
            Zoom
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => zoom(-0.1)}
            >
              &minus;
            </Button>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              className="flex-1"
              value={value.scale}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange({
                  ...value,
                  scale: clamp(parseFloat(e.target.value), 0.5, 3),
                })
              }
            />
            <Button
              type="button"
              variant="secondary"
              className="min-h-8 px-2 py-1 text-xs"
              onClick={() => zoom(0.1)}
            >
              +
            </Button>
            <span className="w-10 text-right text-xs font-semibold text-[var(--rams-charcoal)]">
              {value.scale.toFixed(1)}x
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
            Overlay
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--rams-charcoal)]">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setShowGrid(e.target.checked)
              }
              className="h-4 w-4 rounded border-black/20"
            />
            Rule-of-thirds grid
          </label>
        </div>

        <div className="space-y-1 border-t border-black/8 pt-4">
          <p className="text-[10px] text-[var(--rams-gray)]">
            Position: {Math.round(value.positionX)}%, {Math.round(value.positionY)}%
          </p>
          <p className="text-[10px] text-[var(--rams-gray)]">
            Scale: {value.scale.toFixed(2)}x
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={reset}
          className="w-full text-xs"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function getCustomRatio(
  w: number | undefined,
  h: number | undefined,
): number {
  const width = w ?? 0;
  const height = h ?? 0;
  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (Number.isFinite(ratio) && ratio > 0) return ratio;
  }
  return 4 / 3;
}
