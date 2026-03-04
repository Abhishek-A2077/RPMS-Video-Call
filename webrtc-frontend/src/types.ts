import { RefObject } from "react";

export type ChatMessage = { sender: "me" | "remote"; text: string };

export type StreamType = "local" | "remote" | "localScreen" | "remoteScreen";

export interface StreamConfig {
  id: string;
  active: boolean;
  ref: RefObject<HTMLVideoElement | null>;
  isMirror: boolean;
  isMuted: boolean;
  label: string;
}
