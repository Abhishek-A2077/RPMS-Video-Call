import React from "react";
import type { StreamConfig, StreamType } from "../types";
import { MicIcon } from "./Icons";

interface VideoAreaProps {
  streamActive: boolean;
  activeStreams: StreamConfig[];
  activeMainId: StreamType;
  setActiveMainId: (id: StreamType) => void;
  startCamera: () => void;
}

export const VideoArea: React.FC<VideoAreaProps> = ({
  streamActive,
  activeStreams,
  activeMainId,
  setActiveMainId,
  startCamera,
}) => {
  if (!streamActive) {
    return (
      <div className="video-area">
        <div className="join-btn-container">
          <button className="join-btn" onClick={startCamera}>
            Join Consultation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-area">
      <div className="call-layout">
        <div className="main-view-container">
          {activeStreams.map(
            (s) =>
              s.id === activeMainId && (
                <div key={`main-${s.id}`} className="main-video-wrapper">
                  <video
                    ref={s.ref}
                    autoPlay
                    playsInline
                    muted={s.id === "local"}
                    className={`video-element video-contain ${s.isMirror ? "mirror" : ""}`}
                  />
                  {s.isMuted && (
                    <div className="mute-badge">
                      <MicIcon isMutedIcon={true} />
                    </div>
                  )}
                  <div className="name-badge">{s.label}</div>
                </div>
              ),
          )}
        </div>

        {activeStreams.length > 1 && (
          <div className="sidebar-container">
            {activeStreams.map(
              (s) =>
                s.id !== activeMainId && (
                  <div
                    key={`side-${s.id}`}
                    className="sidebar-video-wrapper"
                    onClick={() => setActiveMainId(s.id as StreamType)}
                  >
                    <video
                      ref={s.ref}
                      autoPlay
                      playsInline
                      muted={s.id === "local"}
                      className={`video-element video-cover ${s.isMirror ? "mirror" : ""}`}
                    />
                    {s.isMuted && (
                      <div className="mute-badge">
                        <MicIcon isMutedIcon={true} />
                      </div>
                    )}
                    <div className="name-badge">{s.label}</div>
                  </div>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};
