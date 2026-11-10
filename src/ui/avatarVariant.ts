/** Portrait for any base model, bust for roleplay. Each zoom is included once. */
export function variantsForModels(models: readonly string[]): Array<"portrait" | "bust"> {
  return [
    ...(models.some((model) => model !== "roleplay") ? (["portrait"] as const) : []),
    ...(models.includes("roleplay") ? (["bust"] as const) : []),
  ];
}

export async function fetchAvatarVariants(
  avatarVariantUrl: string,
  imageUrl: string,
  variantIds: readonly string[],
  generate: boolean,
  signal: AbortSignal,
): Promise<Record<string, string>> {
  const response = await fetch(avatarVariantUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, variant_ids: variantIds, generate }),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as { images?: Record<string, string>; error?: string } | null;
  if (!response.ok || !payload?.images) throw new Error(payload?.error || "Could not prepare the avatar");
  return payload.images;
}
