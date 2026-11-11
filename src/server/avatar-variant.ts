import { httpsImageUrl } from "./https-image-url";

export type CreateAvatarVariantHandlerOptions = {
  /** Your LemonSlice API key. */
  apiKey: string;
  /** LemonSlice rooms endpoint. The hosted cache route sits next to it. */
  lemonSliceUrl: string;
  /** Optional auth gate run before the request is forwarded. */
  authorize?: (request: Request) => Promise<Response | void> | Response | void;
};

/** Forward the call UI to the hosted avatar-variant cache. The browser never sees the API key. */
export function createAvatarVariantHandler({ apiKey, lemonSliceUrl, authorize }: CreateAvatarVariantHandlerOptions) {
  const url = lemonSliceUrl.replace(/\/rooms\/?$/, "/hosted-avatar-variants");
  return async (request: Request) => {
    const body = await request.clone().json().catch(() => null);
    const rejection = await authorize?.(request);
    if (rejection) return rejection;
    if (!apiKey) return Response.json({ error: "LEMONSLICE_API_KEY is not set" }, { status: 500 });

    const imageUrl = httpsImageUrl(body?.image_url);
    const variantIds = body?.variant_ids;
    if (!imageUrl || !Array.isArray(variantIds) || variantIds.length > 8 || !variantIds.every((id) => typeof id === "string")) {
      return Response.json({ error: "Invalid avatar variant request" }, { status: 400 });
    }

    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ image_url: imageUrl, variant_ids: variantIds, generate: body.generate === true }),
        signal: AbortSignal.timeout(60_000),
      });
      return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("[lemonslice] avatar variant cache unreachable:", error);
      return Response.json({ error: "Avatar variant cache unreachable" }, { status: 502 });
    }
  };
}
