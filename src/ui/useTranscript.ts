"use client";

import { useRoomContext } from "@livekit/components-react";
import {
  compareVersions,
  RoomEvent,
  type Participant,
  type Room,
  type TextStreamReader,
} from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { onAgentTranscript, onUserTranscript } from "./moderation";

/** Text-stream topic LiveKit agents read. */
const CHAT_TOPIC = "lk.chat";
/** Data-channel topic kept by `useChat` for older clients. */
const LEGACY_CHAT_TOPIC = "lk-chat-topic";
const TRANSCRIPTION_TOPIC = "lk.transcription";

/** Worker → page: a prompted clip's caption. Other statuses on this topic are ignored. */
const ACTION_TOPIC = "agent/events";

export type TranscriptMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
  /** False while a transcription segment is still interim. */
  final: boolean;
  kind: "chat" | "transcription" | "event";
};

type LegacyChatMessage = {
  id?: unknown;
  message?: unknown;
  ignoreLegacy?: unknown;
};

function messageText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as { text?: unknown };
    if (typeof parsed.text === "string" && parsed.text.trim()) return parsed.text.trim();
  } catch {
    // The chunk is plain text that happens to start with a brace.
  }
  return trimmed;
}

function serverSupportsDataStreams(room: Room): boolean {
  const info = room.serverInfo;
  return info?.edition === 1 || (!!info?.version && compareVersions(info.version, "1.8.2") > 0);
}

function roleFor(room: Room, identity: string | undefined): TranscriptMessage["role"] {
  return identity && identity === room.localParticipant.identity ? "user" : "agent";
}

function upsert(messages: TranscriptMessage[], next: TranscriptMessage): TranscriptMessage[] {
  const index = messages.findIndex((message) => message.id === next.id);
  if (index === -1) return [...messages, next];
  if (messages[index].final && !next.final) return messages;
  const copy = messages.slice();
  copy[index] = next;
  return copy;
}

/**
 * Speech arrives on `lk.transcription` as text deltas, so each chunk updates
 * the bubble before the segment closes. Typed messages go out the same way
 * LiveKit's `useChat` sends them: a text stream on `lk.chat`, then the legacy
 * `lk-chat-topic` packet. The bubble id is the text-stream id.
 */
export function useTranscript(sessionId: string | null) {
  const room = useRoomContext();
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const processedTranscripts = useRef(new Set<string>());
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);

  useEffect(() => {
    let cancelled = false;
    const processed_transcripts = processedTranscripts.current;

    const commit = (message: TranscriptMessage) => {
      if (cancelled || !message.text) return;
      setMessages((current) => upsert(current, message));
      if (!message.final || message.kind === "event" || processed_transcripts.has(message.id)) return;
      processed_transcripts.add(message.id);
      if (message.role === "user") onUserTranscript(message.text, sessionIdRef.current);
      else onAgentTranscript(message.text, sessionIdRef.current);
    };

    const readStream = async (reader: TextStreamReader) => {
      try {
        return await reader.readAll();
      } catch (error) {
        console.error("[lemonslice] could not read a transcript stream:", error);
        return "";
      }
    };

    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, (reader, participant) => {
      if (participant.identity?.includes("lemonslice-avatar")) return;
      const attributes = reader.info.attributes;
      const id = attributes?.["lk.segment_id"] || reader.info.id;
      const role = roleFor(room, participant.identity);
      const finalOnClose =
        attributes?.["lk.transcription_final"] === undefined ||
        attributes?.["lk.transcription_final"] === "true";

      void (async () => {
        let accumulated = "";
        try {
          for await (const chunk of reader) {
            if (cancelled) return;
            accumulated += chunk;
            const text = messageText(accumulated);
            if (!text) continue;
            commit({ id, role, text, final: false, kind: "transcription" });
          }
        } catch (error) {
          console.error("[lemonslice] could not read a transcript stream:", error);
        }
        if (cancelled) return;
        const text = messageText(accumulated);
        if (!text) return;
        commit({ id, role, text, final: finalOnClose, kind: "transcription" });
      })();
    });

    room.registerTextStreamHandler(CHAT_TOPIC, (reader, participant) => {
      void (async () => {
        const text = messageText(await readStream(reader));
        if (cancelled || !text) return;
        commit({
          id: reader.info.id,
          role: roleFor(room, participant.identity),
          text,
          final: true,
          kind: "chat",
        });
      })();
    });

    const onLegacyChat = (
      payload: Uint8Array,
      participant: Participant | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== LEGACY_CHAT_TOPIC) return;
      let parsed: LegacyChatMessage;
      try {
        parsed = JSON.parse(new TextDecoder().decode(payload)) as LegacyChatMessage;
      } catch {
        return;
      }
      if (parsed.ignoreLegacy === true || typeof parsed.message !== "string") return;
      const text = parsed.message.trim();
      if (!text) return;
      commit({
        id: typeof parsed.id === "string" && parsed.id ? parsed.id : crypto.randomUUID(),
        role: roleFor(room, participant?.identity),
        text,
        final: true,
        kind: "chat",
      });
    };

    const onAction = (
      payload: Uint8Array,
      _participant: Participant | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== ACTION_TOPIC) return;
      let data: { type?: unknown; status?: unknown; event?: unknown };
      try {
        data = JSON.parse(new TextDecoder().decode(payload)) as typeof data;
      } catch {
        return;
      }
      if (data.type !== "action" || data.status !== "caption") return;
      const event = typeof data.event === "string" ? data.event.trim() : "";
      if (!event) return;
      // What she did, between the lead-in and the follow-up.
      commit({ id: crypto.randomUUID(), role: "agent", text: event, final: true, kind: "event" });
    };

    room.on(RoomEvent.DataReceived, onLegacyChat);
    room.on(RoomEvent.DataReceived, onAction);

    return () => {
      cancelled = true;
      room.off(RoomEvent.DataReceived, onLegacyChat);
      room.off(RoomEvent.DataReceived, onAction);
      room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC);
      room.unregisterTextStreamHandler(CHAT_TOPIC);
    };
  }, [room]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const info = await room.localParticipant.sendText(trimmed, { topic: CHAT_TOPIC });
      setMessages((current) =>
        upsert(current, { id: info.id, role: "user", text: trimmed, final: true, kind: "chat" }),
      );
      if (!processedTranscripts.current.has(info.id)) {
        processedTranscripts.current.add(info.id);
        onUserTranscript(trimmed, sessionIdRef.current);
      }
      const legacy = {
        id: info.id,
        timestamp: Date.now(),
        message: trimmed,
        ignoreLegacy: serverSupportsDataStreams(room),
      };
      try {
        await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(legacy)), {
          reliable: true,
          topic: LEGACY_CHAT_TOPIC,
        });
      } catch (error) {
        console.info("[lemonslice] could not send message in legacy chat format", error);
      }
    },
    [room],
  );

  return { messages, send };
}
