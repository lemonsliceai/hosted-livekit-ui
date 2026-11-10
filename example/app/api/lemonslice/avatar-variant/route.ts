import { createAvatarVariantHandler } from "@lemonslice/hosted-call/server";

export const POST = createAvatarVariantHandler({
  apiKey: process.env.LEMONSLICE_API_KEY ?? "",
  lemonSliceUrl: process.env.LEMONSLICE_API_URL ?? "https://lemonslice.com/api/liveai/rooms",
});
