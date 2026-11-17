import type { SelectOption } from "./Select";

/** Model id sent to the room. */
export type LemonSliceVideoModel = "cwm-1-lite" | "cwm-1" | "roleplay";

type VideoModelDefaults = {
  label: string;
  crop: "portrait" | "bust";
  /** Chat panel open when the call starts. */
  transcriptOpen: boolean;
  /** Suggestion pills shown on the video. */
  suggestions: boolean;
};

/** Per-model defaults. `models` entries can override the optional ones. */
export const VIDEO_MODELS = {
  "cwm-1-lite": { label: "FaceTime Lite", crop: "portrait", transcriptOpen: false, suggestions: false },
  "cwm-1": { label: "FaceTime", crop: "portrait", transcriptOpen: false, suggestions: false },
  roleplay: { label: "Roleplay", crop: "bust", transcriptOpen: true, suggestions: true },
} as const satisfies Record<LemonSliceVideoModel, VideoModelDefaults>;

// TODO: Deprecated. Remove "standard" and "premium" once integrations pass the backend ids.
type LegacyVideoModel = "standard" | "premium";
const LEGACY_MODEL_IDS = new Map<string, LemonSliceVideoModel>([
  ["standard", "cwm-1-lite"],
  ["premium", "cwm-1"],
]);
const warnedLegacyIds = new Set<string>();

/** One entry in the video model dropdown. */
export type LemonSliceVideoModelOption = {
  model: LemonSliceVideoModel | LegacyVideoModel;
  /** Shown in the dropdown. Defaults to FaceTime Lite, FaceTime, or Roleplay. */
  label?: string;
  /** Subtitle under the label, like the voice descriptions. */
  description?: string;
  /** Chat panel open when the call starts. On for roleplay only by default. */
  transcriptOpen?: boolean;
};

/** What `models` accepts: an id, or an id with its own label, description, and defaults. */
export type LemonSliceVideoModelInput = LemonSliceVideoModel | LegacyVideoModel | LemonSliceVideoModelOption;

export type ResolvedVideoModel = SelectOption<LemonSliceVideoModel> & { transcriptOpen: boolean };

/** Shown when `models` is omitted. Roleplay has to be opted into. */
export const DEFAULT_VIDEO_MODELS: readonly LemonSliceVideoModel[] = ["cwm-1-lite", "cwm-1"];

function isVideoModel(id: string): id is LemonSliceVideoModel {
  // Own keys only: `in` would accept "toString" and the like off the prototype.
  return Object.prototype.hasOwnProperty.call(VIDEO_MODELS, id);
}

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
    if (!option) continue;
    const model = LEGACY_MODEL_IDS.get(option.model) ?? option.model;
    if (model !== option.model && !warnedLegacyIds.has(option.model)) {
      warnedLegacyIds.add(option.model);
      console.warn(`LemonSliceCall: models id "${option.model}" is deprecated; use "${model}".`);
    }
    if (!isVideoModel(model)) continue;
    if (rows.some((row) => row.value === model)) continue;
    const defaults = VIDEO_MODELS[model];
    rows.push({
      value: model,
      label: option.label?.trim() || defaults.label,
      ...(option.description?.trim() ? { description: option.description.trim() } : {}),
      transcriptOpen: option.transcriptOpen ?? defaults.transcriptOpen,
    });
  }
  return rows.length > 0 ? rows : resolveVideoModels(undefined);
}
