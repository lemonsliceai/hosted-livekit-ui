import { VIDEO_MODELS, type LemonSliceVideoModel } from "./videoModels";

const AVATAR_VARIANT_PATH = "/api/lemonslice/avatar-variant";

/** The crop a call starts from: bust for roleplay, portrait for the base models. */
export function cropForModel(model: LemonSliceVideoModel) {
  return VIDEO_MODELS[model].crop;
}

/** The crops for these models, each once. */
export function cropsForModels(models: readonly LemonSliceVideoModel[]) {
  return [...new Set(models.map(cropForModel))];
}

export type CropResult = {
  images: Record<string, string>;
  /** False when the photo has no face; undefined when unknown. */
  faceDetected?: boolean;
};

/**
 * `generate: false` only looks the crops up (fast; nothing is downloaded on a hit).
 * `generate: true` also creates the ones that are missing.
 */
export async function fetchCrops(
  imageUrl: string,
  crops: readonly string[],
  generate: boolean,
  signal?: AbortSignal,
): Promise<CropResult> {
  const response = await fetch(AVATAR_VARIANT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, variant_ids: crops, generate }),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as {
    images?: Record<string, string>;
    face_detected?: unknown;
    error?: string;
  } | null;
  if (!response.ok || !payload?.images) throw new Error(payload?.error || "Could not prepare the avatar");
  return {
    images: payload.images,
    ...(typeof payload.face_detected === "boolean" ? { faceDetected: payload.face_detected } : {}),
  };
}
