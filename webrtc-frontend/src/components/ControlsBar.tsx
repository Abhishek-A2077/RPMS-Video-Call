import React from "react";
import {
  MicIcon,
  CameraIcon,
  ScreenShareIcon,
  ChatIcon,
  ChatCloseIcon,
  PhoneIcon,
} from "./Icons";

interface ControlsBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  hasUnreadChat: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  setIsChatOpen: (val: boolean) => void;
  leaveCall: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isChatOpen,
  hasUnreadChat,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  setIsChatOpen,
  leaveCall,
}) => {
  return (
    <div className="controls-bar">
      <button
        onClick={toggleMic}
        className={`control-btn ${isMuted ? "off" : ""}`}
        title="Toggle Microphone"
      >
        <MicIcon isMutedIcon={isMuted} />
      </button>

      <button
        onClick={toggleCamera}
        className={`control-btn ${isCameraOff ? "off" : ""}`}
        title="Toggle Camera"
      >
        <CameraIcon isCameraOff={isCameraOff} />
      </button>

      <button
        onClick={toggleScreenShare}
        className={`control-btn ${isScreenSharing ? "leave" : ""}`}
        title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
      >
        <ScreenShareIcon showX={isScreenSharing} />
      </button>

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`control-btn ${isChatOpen ? "active-chat" : !isChatOpen && hasUnreadChat ? "" : "off"}`}
        title="Toggle Chat"
      >
        {isChatOpen ? <ChatCloseIcon /> : <ChatIcon />}
        {hasUnreadChat && !isChatOpen && <span className="unread-dot" />}
      </button>

      <button
        onClick={leaveCall}
        className="control-btn leave"
        title="End Call"
      >
        <PhoneIcon />
      </button>
    </div>
  );
};
