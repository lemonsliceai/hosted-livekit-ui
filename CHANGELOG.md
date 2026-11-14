# Changelog

## Unreleased

- `voiceId` on the room is optional. Leave it out to have LemonSlice pick a voice that fits the
  avatar image; the same image always gets the same voice.
- **Suggested** shows the name of the voice the call will use, asked from your start-call route
  before the call. The `suggestedVoiceId` prop is removed; delete it from `<LemonSliceCall>`.
- The call setup now sends a `suggested_voice: true` request to `startCallUrl`.
  `createRoomHandler` answers it without creating a room; a hand-written start-call route
  should do the same.

## v0.3.0

Improve developer ergonomics. Add suggestion pills, including scene changes to a new
reference image.

## v0.2.0

Various UI updates. Enable roleplay actions.

## v0.1.0

Initial release.
