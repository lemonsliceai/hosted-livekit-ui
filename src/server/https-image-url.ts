export function httpsImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const imageUrl = value.trim();
  if (!imageUrl || imageUrl.length > 2048) return null;
  try {
    return new URL(imageUrl).protocol === "https:" ? imageUrl : null;
  } catch {
    return null;
  }
}
