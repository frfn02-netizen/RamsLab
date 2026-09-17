import type { CropAspectRatio } from "@/types/modules";

export const ASPECT_RATIO_MAP: Record<CropAspectRatio, number> = {
  "4/3": 4 / 3,
  "16/9": 16 / 9,
  "1/1": 1,
  "3/4": 3 / 4,
  "9/16": 9 / 16,
  custom: 4 / 3,
};

export const ASPECT_RATIO_CSS: Record<CropAspectRatio, string> = {
  "4/3": "4 / 3",
  "16/9": "16 / 9",
  "1/1": "1 / 1",
  "3/4": "3 / 4",
  "9/16": "9 / 16",
  custom: "4 / 3",
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getAspectRatioNumeric(value: CropAspectRatio): number {
  return ASPECT_RATIO_MAP[value] ?? 4 / 3;
}

export function getAspectRatioCSS(value: CropAspectRatio): string {
  return ASPECT_RATIO_CSS[value] ?? "4 / 3";
}

export function getCustomAspectRatioCSS(
  w: number | undefined,
  h: number | undefined,
): string {
  const width = Math.round(w ?? 0);
  const height = Math.round(h ?? 0);
  if (width > 0 && height > 0) return `${width} / ${height}`;
  return "4 / 3";
}

export function getCustomAspectRatioNumeric(
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

export interface CropSettings {
  aspectRatio: CropAspectRatio;
  positionX: number;
  positionY: number;
  scale: number;
  customWidth?: number;
  customHeight?: number;
}

export function clampCropSettings(settings: CropSettings): CropSettings {
  return {
    aspectRatio: settings.aspectRatio,
    positionX: clamp(settings.positionX, 0, 100),
    positionY: clamp(settings.positionY, 0, 100),
    scale: clamp(settings.scale, 0.5, 3),
    customWidth: settings.customWidth,
    customHeight: settings.customHeight,
  };
}

export function getCropStyles(settings: CropSettings) {
  const clamped = clampCropSettings(settings);
  return {
    objectPosition: `${clamped.positionX}% ${clamped.positionY}%`,
    transform: `scale(${clamped.scale})`,
  };
}

export function getDefaultCropSettings(): CropSettings {
  return {
    aspectRatio: "4/3",
    positionX: 50,
    positionY: 50,
    scale: 1,
    customWidth: undefined,
    customHeight: undefined,
  };
}

export interface ResearchImageStyles {
  aspectRatio: string;
  objectPosition: string;
  fit: "cover" | "contain";
  scale: number;
}

export function getResearchImageStyles(
  area: Pick<
    {
      cropAspectRatio?: CropAspectRatio;
      cropPositionX?: number;
      cropPositionY?: number;
      cropScale?: number;
      imageFit?: string;
      customWidth?: number;
      customHeight?: number;
    },
    | "cropAspectRatio"
    | "cropPositionX"
    | "cropPositionY"
    | "cropScale"
    | "imageFit"
    | "customWidth"
    | "customHeight"
  >,
): ResearchImageStyles {
  const cropAR = area.cropAspectRatio ?? "4/3";
  const posX = area.cropPositionX ?? 50;
  const posY = area.cropPositionY ?? 50;
  const scale = area.cropScale ?? 1;
  const fit = (area.imageFit ?? "cover") as "cover" | "contain";

  let aspectRatio: string;
  if (cropAR === "custom" && area.customWidth && area.customHeight) {
    aspectRatio = getCustomAspectRatioCSS(area.customWidth, area.customHeight);
  } else {
    aspectRatio = getAspectRatioCSS(cropAR);
  }

  return {
    aspectRatio,
    objectPosition: `${posX}% ${posY}%`,
    fit,
    scale,
  };
}
