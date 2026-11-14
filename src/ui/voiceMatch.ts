/**
 * Asks your start-call route which voice Suggested is: the room's voiceId, or the voice
 * LemonSlice matched to the image when there is none. `generate: false` only looks the match
 * up; true matches one if the image has none. Null when there is none, or on any failure.
 */
export async function fetchSuggestedVoice(
  startCallUrl: string,
  imageUrl: string | undefined,
  generate: boolean,
  signal?: AbortSignal,
): Promise<string | null> {
  const response = await fetch(startCallUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suggested_voice: true, generate, ...(imageUrl ? { agent_image_url: imageUrl } : {}) }),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as { voice_id?: unknown } | null;
  if (!response.ok) return null;
  return typeof payload?.voice_id === "string" && payload.voice_id ? payload.voice_id : null;
}
