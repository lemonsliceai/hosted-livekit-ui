import { PlayIcon, StopIcon, VideoCameraIcon } from "./icons";
import { Select, type SelectOption } from "./Select";
import { VOICE_PREVIEWS } from "./sounds/voices";
import { useVoicePreview } from "./useVoicePreview";

export type LemonSliceVideoModel = "standard" | "premium" | "roleplay";

const VOICES: SelectOption<string>[] = [
  { value: "", label: "Suggested", description: "Recommended voice" },
  { value: "0984f8581bbb4e5e980a990abb865874", label: "Blair", description: "Female, natural conversational", group: "female" },
  { value: "274434b3256f4e4cb35f8fc9fd54c1b8", label: "Caleb", description: "Male, warm and kind", group: "male" },
  { value: "9fa4b7a1b67446b48208f2f5d4bcd8da", label: "Dax", description: "Male", group: "male" },
  { value: "a86e0b366b804d5db4dabd2c7a31bd32", label: "Ethan", description: "Male", group: "male" },
  { value: "20bc7ce996374f60bed8fbf01396faa5", label: "Felix", description: "Male", group: "male" },
  { value: "9a9cf47702da476aa4629e2506d4a857", label: "Hannah", description: "Female, punchy and fiery", group: "female" },
  { value: "1f97ab64476c4e468a0888ae22954dab", label: "Hugo", description: "Male, deep and friendly", group: "male" },
  { value: "d0077cf5ec514adb8a9bb3d7b30d6ebc", label: "Iris", description: "Female", group: "female" },
  { value: "08b4100b4c3747fe84ed8b57d26a95ba", label: "James", description: "Male, clear British", group: "male" },
  { value: "8451cb6e7e204684973f172cc616ec20", label: "Jonah", description: "Male", group: "male" },
  { value: "7882b0ed0f2a4a30bb89170985d19edc", label: "Juno", description: "Female, bright anime", group: "female" },
  { value: "622cdee7d95249d783088f7260085cc4", label: "Kai", description: "Male", group: "male" },
  { value: "8528034030ff4661bd1f9d3dcc14a8fb", label: "Lena", description: "Female", group: "female" },
  { value: "d17747d4522e4c3fb73aed8110f4df07", label: "Maren", description: "Female, calm and grounded", group: "female" },
  { value: "e7de86b388864b8cbd50d0d70a3494e5", label: "Mia", description: "Female, bubbly Australian", group: "female" },
  { value: "c8a625e4b0bd43d0ae79127163253b52", label: "Nova", description: "Female", group: "female" },
  { value: "2cb3eee641694eb5a11861d0f4a1d494", label: "Olivia", description: "Female, warm and easygoing", group: "female" },
  { value: "2321552f1b0d4120b89e59a108bfa9d7", label: "Reese", description: "Female, lively mid-20s", group: "female" },
  { value: "43d0c55ea6814a9dab44a06ddfe03658", label: "Rhys", description: "Male, relaxed British", group: "male" },
  { value: "41625f10f3c24ad7a546da8577515c3e", label: "Roman", description: "Male, deep and commanding", group: "male" },
  { value: "4f14b263c4ee418b9193de6ab1123015", label: "Sadie", description: "Female, sweet and friendly", group: "female" },
  { value: "b0ecddac0c1b4b48b6a01215d6d17849", label: "Vera", description: "Female, low and husky", group: "female" },
];

export const VIDEO_MODEL_IDS = {
  standard: "cwm-1-lite",
  premium: "cwm-1",
  roleplay: "roleplay",
} as const satisfies Record<LemonSliceVideoModel, string>;

/** One entry in the video model dropdown. */
export type LemonSliceVideoModelOption = {
  model: LemonSliceVideoModel;
  /** Shown in the dropdown. Defaults to FaceTime Lite, FaceTime, or Roleplay. */
  label?: string;
  /** Subtitle under the label, like the voice descriptions. */
  description?: string;
};

/** What `models` accepts: an id, or an id with its own label and description. */
export type LemonSliceVideoModelInput = LemonSliceVideoModel | LemonSliceVideoModelOption;

const MODEL_LABELS: Record<LemonSliceVideoModel, string> = {
  standard: "FaceTime Lite",
  premium: "FaceTime",
  roleplay: "Roleplay",
};

/** Shown when `models` is omitted. Roleplay has to be opted into. */
export const DEFAULT_VIDEO_MODELS: readonly LemonSliceVideoModel[] = ["standard", "premium"];

/**
 * Dropdown rows in the order given. The first row is the default selection.
 * Unknown ids and repeats are dropped; an empty result falls back to the defaults.
 */
export function resolveVideoModels(
  models: readonly LemonSliceVideoModelInput[] | undefined,
): SelectOption<LemonSliceVideoModel>[] {
  const rows: SelectOption<LemonSliceVideoModel>[] = [];
  for (const entry of models ?? DEFAULT_VIDEO_MODELS) {
    const option = typeof entry === "string" ? { model: entry } : entry;
    // Own keys only: `in` would accept "toString" and the like off the prototype.
    if (!option || !Object.prototype.hasOwnProperty.call(MODEL_LABELS, option.model)) continue;
    if (rows.some((row) => row.value === option.model)) continue;
    rows.push({
      value: option.model,
      label: option.label?.trim() || MODEL_LABELS[option.model],
      ...(option.description?.trim() ? { description: option.description.trim() } : {}),
    });
  }
  return rows.length > 0 ? rows : resolveVideoModels(undefined);
}

/** When the configured voice is already in the list, Suggested takes its name and the duplicate row goes away. */
function voiceOptions(suggestedVoiceId?: string): SelectOption<string>[] {
  const match = VOICES.find((voice) => voice.value === suggestedVoiceId);
  if (!match) return VOICES;
  return VOICES.flatMap((voice) => {
    if (voice.value === "") {
      return [{ ...voice, label: `${match.label} (Suggested)`, description: match.description }];
    }
    if (voice.value === match.value) return [];
    return [voice];
  });
}

export function PreCallSetup({
  voiceId,
  suggestedVoiceId,
  model,
  modelOptions,
  errorMessage,
  onVoiceChange,
  onModelChange,
}: {
  voiceId: string;
  /** Fish Audio voice the server uses when the visitor leaves Suggested selected. */
  suggestedVoiceId?: string;
  model: LemonSliceVideoModel;
  /** From `resolveVideoModels`. The dropdown is hidden when there is only one. */
  modelOptions: SelectOption<LemonSliceVideoModel>[];
  errorMessage: string | null;
  onVoiceChange: (voiceId: string) => void;
  onModelChange: (model: LemonSliceVideoModel) => void;
}) {
  const preview = useVoicePreview();
  const options = voiceOptions(suggestedVoiceId);
  const showModels = modelOptions.length > 1;
  const suggestedPreviewId = VOICES.some((voice) => voice.value === suggestedVoiceId)
    ? suggestedVoiceId
    : undefined;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full gap-3">
        <Select
          label="Voice"
          value={voiceId}
          options={options}
          wide={showModels}
          filtersLabel="Gender"
          renderOptionAction={(option) => {
            const previewId = option.value || suggestedPreviewId || "";
            const src = VOICE_PREVIEWS[previewId];
            if (!src) return <span className="ls-voice-preview-spacer" aria-hidden />;
            const playing = preview.playingId === previewId;
            return (
              <button
                type="button"
                tabIndex={-1}
                data-option-action=""
                className="ls-voice-preview"
                data-playing={playing ? "" : undefined}
                aria-label={`${playing ? "Stop" : "Play"} ${option.label} preview`}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  preview.toggle(previewId, src);
                }}
              >
                {playing ? <StopIcon /> : <PlayIcon />}
              </button>
            );
          }}
          filters={[
            { id: "all", label: "All" },
            { id: "female", label: "Female", group: "female" },
            { id: "male", label: "Male", group: "male" },
          ]}
          onChange={onVoiceChange}
        />
        {showModels && (
          <Select label="Video model" value={model} options={modelOptions} onChange={onModelChange} />
        )}
      </div>
      {errorMessage && <p className="ls-error self-center">{errorMessage}</p>}
    </div>
  );
}

export function PreCallStartButton({
  errorMessage,
  onStart,
}: {
  errorMessage: string | null;
  onStart: () => void;
}) {
  return (
    <button type="button" className="ls-precall-start" onClick={onStart}>
      <VideoCameraIcon />
      {errorMessage ? "Try again" : "Start call"}
    </button>
  );
}
