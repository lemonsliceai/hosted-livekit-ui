"use client";

import { useRoomContext } from "@livekit/components-react";
import type { Room } from "livekit-client";
import { useEffect, useRef } from "react";

/**
 * Hands the connected room to `onRoom`, and null when the call ends. Lets code
 * outside the component listen to the room's data topics without depending on
 * LiveKit's React context. Renders nothing.
 */
export function RoomTap({ onRoom }: { onRoom: (room: Room | null) => void }) {
  const room = useRoomContext();
  const onRoomRef = useRef(onRoom);
  onRoomRef.current = onRoom;
  useEffect(() => {
    onRoomRef.current(room);
    return () => onRoomRef.current(null);
  }, [room]);
  return null;
}
