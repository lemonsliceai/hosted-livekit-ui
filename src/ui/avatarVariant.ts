/** Portrait for any base model, bust for roleplay. Each zoom is included once. */
export function variantsForModels(models: readonly string[]): Array<"portrait" | "bust"> {
  return [
    ...(models.some((model) => model !== "roleplay") ? (["portrait"] as const) : []),
    ...(models.includes("roleplay") ? (["bust"] as const) : []),
  ];
}

const AVATAR_VARIANT_PATH = "/api/lemonslice/avatar-variant";
const cache = new Map<string, Record<string, string>>();

function cacheKey(imageUrl: string, models: readonly string[]) {
  return `${imageUrl}\n${variantsForModels(models).join(",")}`;
}

/** Crops already prepared for this image in this page session. */
export function cachedAvatarVariants(imageUrl: string, models: readonly string[]) {
  return cache.get(cacheKey(imageUrl, models));
}

async function postAvatarVariants(imageUrl: string, variantIds: readonly string[], generate: boolean) {
  const response = await fetch(AVATAR_VARIANT_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, variant_ids: variantIds, generate }),
  });
  const payload = (await response.json().catch(() => null)) as { images?: Record<string, string>; error?: string } | null;
  if (!response.ok || !payload?.images) throw new Error(payload?.error || "Could not prepare the avatar");
  return payload.images;
}

/**
 * Looks up existing crops, then generates the missing ones. `onLookup` fires as soon as the lookup
 * returns, with whatever was found (possibly nothing), so the caller can stop waiting on it.
 */
export async function loadAvatarVariants(
  imageUrl: string,
  models: readonly string[],
  onLookup: (found: Record<string, string>) => void,
) {
  const variantIds = variantsForModels(models);
  const found = await postAvatarVariants(imageUrl, variantIds, false);
  onLookup(found);
  const missing = variantIds.filter((id) => !found[id]);
  const images = missing.length === 0 ? found : { ...found, ...(await postAvatarVariants(imageUrl, missing, true)) };
  if (variantIds.some((id) => !images[id])) throw new Error("Could not prepare the avatar");
  cache.set(cacheKey(imageUrl, models), images);
  return images;
}
