# Changelog

## Unreleased

- `voiceId` on the room is optional. Leave it out to have LemonSlice pick a voice that fits the
  avatar image; the same image always gets the same voice.
- **Suggested** shows the name of the voice the call will use. The call setup gets it with a GET
  to `startCallUrl`, so export the handler as both `GET` and `POST`
  (`export { handler as GET, handler as POST }`). Without `GET`, Suggested shows no name.
- The `suggestedVoiceId` prop is removed; delete it from `<LemonSliceCall>`.

## v0.3.0

Improve developer ergonomics. Add suggestion pills, including scene changes to a new
reference image.

## v0.2.0

Various UI updates. Enable roleplay actions.

## v0.1.0

Initial release.
