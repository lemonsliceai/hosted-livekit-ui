export type CreateAvatarVariantHandlerOptions = {
  /** Your LemonSlice API key. */
  apiKey: string;
  /** LemonSlice rooms endpoint. The hosted cache route sits next to it. */
  lemonSliceUrl: string;
};

/** Forward the call UI to the hosted avatar-variant cache. The browser never sees the API key. */
export function createAvatarVariantHandler({ apiKey, lemonSliceUrl }: CreateAvatarVariantHandlerOptions) {
  const url = lemonSliceUrl.replace(/\/rooms\/?$/, "/hosted-avatar-variants");
  return async (request: Request) => {
    if (!apiKey) return Response.json({ error: "LEMONSLICE_API_KEY is not set" }, { status: 500 });
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: await request.text(),
      });
      return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("[lemonslice] avatar variant cache unreachable:", error);
      return Response.json({ error: "Avatar variant cache unreachable" }, { status: 502 });
    }
  };
}
