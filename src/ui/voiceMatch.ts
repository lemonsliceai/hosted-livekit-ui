export async function fetchSuggestedVoice(
  startCallUrl: string,
  imageUrl: string | undefined,
  generate: boolean,
): Promise<string | null> {
  const response = await fetch(startCallUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suggested_voice: true, generate, ...(imageUrl ? { agent_image_url: imageUrl } : {}) }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json().catch(() => null)) as { voice_id?: unknown } | null;
  if (!response.ok) return null;
  return typeof payload?.voice_id === "string" && payload.voice_id ? payload.voice_id : null;
}
