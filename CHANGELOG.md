# Changelog

## Unreleased

- `agentOverrides` takes `lora` and `loraScale`: the avatar's actions are generated with that
  LoRA, at that strength (0 to 2, default 1). Needs a LemonSlice server update.
- Every `agentOverrides` field is now sent (camelCase keys as snake_case), so fields added on the
  LemonSlice side work without a new version of this package. Fields LemonSlice does not use are
  ignored.

## v0.6.0

- Pills have an X that hides the pill for the rest of the call.
- A pill takes `sticky`: an action pill stays after a tap so it can be tapped again. Off by
  default.

## v0.5.0

- `voiceId` on `<LemonSliceCall>` sets the **Suggested** voice. It is shown without asking the
  start-call route and sent when the call starts, so it overrides the room's `voiceId`.
- The chat panel starts open on Roleplay and closed on FaceTime and FaceTime Lite. Set
  `transcriptOpen` on a `models` entry to change it.
- A pill takes `chatMessage`: sent as the visitor's line in place of the label, and shown in
  the transcript. Use it for a longer description than fits on the pill.
- A scene pill's `prompt` is renamed `roleplayPrompt`. `prompt` still works but is deprecated;
  `roleplayPrompt` wins when both are set.

## v0.4.0

- `voiceId` on the room is optional. Leave it out to have LemonSlice pick a voice that fits the
  avatar image; the same image always gets the same voice.
- **Suggested** shows the name of the voice the call will use when it is a listed voice. The
  call setup gets it with a GET to `startCallUrl`, so export the handler as both `GET` and
  `POST` (`export { handler as GET, handler as POST }`). Without `GET`, Suggested shows no name.
- The `suggestedVoiceId` prop is removed; delete it from `<LemonSliceCall>`.

## v0.3.0

Improve developer ergonomics. Add suggestion pills, including scene changes to a new
reference image.

## v0.2.0

Various UI updates. Enable roleplay actions.

## v0.1.0

Initial release.
