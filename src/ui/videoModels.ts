import type { SelectOption } from "./Select";

export type LemonSliceVideoModel = "standard" | "premium" | "roleplay" | "story";

type VideoModelDefaults = {
  /** Model id sent to the room. */
  id: string;
  label: string;
  crop: "portrait" | "bust";
  /** Chat panel open when the call starts. */
  transcriptOpen: boolean;
  /** Suggestion pills shown on the video. */
  suggestions: boolean;
};

/** Per-model defaults. `models` entries can override the optional ones. */
export const VIDEO_MODELS = {
  standard: { id: "cwm-1-lite", label: "FaceTime Lite", crop: "portrait", transcriptOpen: false, suggestions: false },
  premium: { id: "cwm-1", label: "FaceTime", crop: "portrait", transcriptOpen: false, suggestions: false },
  roleplay: { id: "roleplay", label: "Roleplay", crop: "bust", transcriptOpen: true, suggestions: true },
  story: { id: "story", label: "Story", crop: "bust", transcriptOpen: true, suggestions: true },
} as const satisfies Record<LemonSliceVideoModel, VideoModelDefaults>;

/** One entry in the video model dropdown. */
export type LemonSliceVideoModelOption = {
  model: LemonSliceVideoModel;
  /** Shown in the dropdown. Defaults to FaceTime Lite, FaceTime, Roleplay, or Story. */
  label?: string;
  /** Subtitle under the label, like the voice descriptions. */
  description?: string;
  /** Chat panel open when the call starts. On for Roleplay and Story by default. */
  transcriptOpen?: boolean;
};

/** What `models` accepts: an id, or an id with its own label, description, and defaults. */
export type LemonSliceVideoModelInput = LemonSliceVideoModel | LemonSliceVideoModelOption;

export type ResolvedVideoModel = SelectOption<LemonSliceVideoModel> & { transcriptOpen: boolean };

/** Shown when `models` is omitted. Roleplay has to be opted into. */
export const DEFAULT_VIDEO_MODELS: readonly LemonSliceVideoModel[] = ["standard", "premium"];

/**
 * Dropdown rows in the order given. The first row is the default selection.
 * Unknown ids and repeats are dropped; an empty result falls back to the defaults.
 */
export function resolveVideoModels(
  models: readonly LemonSliceVideoModelInput[] | undefined,
): ResolvedVideoModel[] {
  const rows: ResolvedVideoModel[] = [];
  for (const entry of models ?? DEFAULT_VIDEO_MODELS) {
    const option = typeof entry === "string" ? { model: entry } : entry;
    // Own keys only: `in` would accept "toString" and the like off the prototype.
    if (!option || !Object.prototype.hasOwnProperty.call(VIDEO_MODELS, option.model)) continue;
    if (rows.some((row) => row.value === option.model)) continue;
    const defaults = VIDEO_MODELS[option.model];
    rows.push({
      value: option.model,
      label: option.label?.trim() || defaults.label,
      ...(option.description?.trim() ? { description: option.description.trim() } : {}),
      transcriptOpen: option.transcriptOpen ?? defaults.transcriptOpen,
    });
  }
  return rows.length > 0 ? rows : resolveVideoModels(undefined);
}
