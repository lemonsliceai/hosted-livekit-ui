export function onUserTranscript(transcript: string, sessionId: string | null) {
  // call your moderation endpoint here with the user transcript.
  //
  // await fetch("https://your-server.example/moderate", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ transcript, lemonslice_session_id: sessionId }),
  // });
}

export function onAgentTranscript(transcript: string, sessionId: string | null) {
  // call your moderation endpoint here with the agent transcript.
  //
  // await fetch("https://your-server.example/moderate", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ transcript, lemonslice_session_id: sessionId }),
  // });
}
