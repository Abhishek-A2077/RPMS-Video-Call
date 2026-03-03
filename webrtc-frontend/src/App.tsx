// src/App.tsx
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css"; // Make sure this is imported!

const socket: Socket = io("http://localhost:3000");
const ROOM_ID = "test-room";

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type ChatMessage = { sender: "me" | "remote"; text: string };

function App() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // New state for chat toggle

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    socket.on("user-joined", async () => {
      await createOffer();
    });

    socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
      await createAnswer(offer);
    });

    socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
      }
    });

    socket.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      }
    });

    socket.on("chat-message", (message: string) => {
      setChatMessages((prev) => [...prev, { sender: "remote", text: message }]);
    });

    return () => {
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("chat-message");
    };
  }, []);

  // Attach local stream once the UI renders
  useEffect(() => {
    if (streamActive && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [streamActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      setupPeerConnection(stream);
      socket.emit("join-room", ROOM_ID);
      setStreamActive(true);
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId: ROOM_ID,
          candidate: event.candidate,
        });
      }
    };
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current) return;
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socket.emit("offer", { roomId: ROOM_ID, offer });
  };

  const createAnswer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    await peerConnectionRef.current.setRemoteDescription(offer);
    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);
    socket.emit("answer", { roomId: ROOM_ID, answer });
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    socket.emit("chat-message", { roomId: ROOM_ID, message: chatInput });
    setChatMessages((prev) => [...prev, { sender: "me", text: chatInput }]);
    setChatInput("");
  };
  const leaveCall = () => {
    // 1. Stop all camera and mic hardware tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // 2. Close the peer-to-peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 3. Clear out the video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // 4. Reset all UI states
    setStreamActive(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setChatMessages([]);

    // 5. (Optional) Tell the signaling server you left so it can notify the other user
    // socket.emit('leave-room', ROOM_ID);
  };
  return (
    <div className="app-container">
      {/* Video Area */}
      <div className="video-area">
        {!streamActive ? (
          <button className="join-btn" onClick={startCamera}>
            Join Call
          </button>
        ) : (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />

            {/* Controls Bar */}
            <div className="controls-bar">
              <button
                onClick={toggleMic}
                className={`control-btn ${isMuted ? "off" : ""}`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={toggleCamera}
                className={`control-btn ${isCameraOff ? "off" : ""}`}
              >
                {isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
              </button>
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`control-btn ${isChatOpen ? "off" : ""}`}
              >
                {isChatOpen ? "Close Chat" : "Open Chat"}
              </button>
              <button
                onClick={leaveCall}
                className="control-btn off"
                style={{ backgroundColor: "#ea4335" }} // Red hang-up button
              >
                Leave Call
              </button>
            </div>
          </>
        )}
      </div>

      {/* Chat Area */}
      {streamActive && isChatOpen && (
        <div className="chat-panel">
          <div className="chat-header">In-call messages</div>

          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} className="chat-form">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send a message..."
              className="chat-input"
            />
            <button type="submit" className="chat-submit">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
