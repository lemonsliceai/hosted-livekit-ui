export async function fetchSuggestedVoice(startCallUrl: string, imageUrl: string | undefined): Promise<string | null> {
  const url = new URL(startCallUrl, window.location.href);
  if (imageUrl) url.searchParams.set("image_url", imageUrl);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const payload = (await response.json().catch(() => null)) as { voice_id?: unknown } | null;
  if (!response.ok) return null;
  return typeof payload?.voice_id === "string" && payload.voice_id ? payload.voice_id : null;
}
