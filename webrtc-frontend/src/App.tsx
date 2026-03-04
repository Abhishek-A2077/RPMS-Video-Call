import { useEffect, useRef, useState, FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import "./App.css";
import type { ChatMessage, StreamType, StreamConfig } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { ControlsBar } from "./components/ControlsBar";
import { VideoArea } from "./components/VideoArea";

const socket: Socket = io("http://localhost:3000");
const ROOM_ID = "test-room";

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function App() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const remoteScreenStreamRef = useRef<MediaStream | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(isChatOpen);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [hasRemoteUser, setHasRemoteUser] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);

  const [activeMainId, setActiveMainId] = useState<StreamType>("local");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [notification, setNotification] = useState<string | null>(null);
  const [chatNotification, setChatNotification] = useState<{
    sender: string;
    text: string;
  } | null>(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) setHasUnreadChat(false);
  }, [isChatOpen]);

  useEffect(() => {
    if (
      localVideoRef.current &&
      localVideoRef.current.srcObject !== localStreamRef.current
    ) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (
      remoteVideoRef.current &&
      remoteVideoRef.current.srcObject !== remoteStreamRef.current
    ) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (
      localScreenVideoRef.current &&
      localScreenVideoRef.current.srcObject !== localScreenStreamRef.current
    ) {
      localScreenVideoRef.current.srcObject = localScreenStreamRef.current;
    }
    if (
      remoteScreenVideoRef.current &&
      remoteScreenVideoRef.current.srcObject !== remoteScreenStreamRef.current
    ) {
      remoteScreenVideoRef.current.srcObject = remoteScreenStreamRef.current;
    }
  });

  useEffect(() => {
    socket.on("user-joined", async () => {
      setNotification("A user has joined the room.");
      setTimeout(() => setNotification(null), 4000);
      await createOffer();
    });

    socket.on(
      "offer",
      async (offer: RTCSessionDescriptionInit) => await createAnswer(offer),
    );

    socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(answer);
        } catch (e) {}
      }
    });

    socket.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (e) {}
      }
    });

    socket.on("chat-message", (message: string) => {
      setChatMessages((prev) => [...prev, { sender: "remote", text: message }]);

      if (!isChatOpenRef.current) {
        setHasUnreadChat(true);
        setChatNotification({ sender: "Remote User", text: message });
        setTimeout(() => setChatNotification(null), 4000);
      }
    });

    socket.on("mute-status", (mutedState: boolean) =>
      setIsRemoteMuted(mutedState),
    );

    socket.on("user-left", () => {
      setNotification("Remote user has disconnected.");
      setTimeout(() => setNotification(null), 4000);

      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteScreenVideoRef.current)
        remoteScreenVideoRef.current.srcObject = null;

      setHasRemoteUser(false);
      setIsRemoteScreenSharing(false);
      setIsRemoteMuted(false);
      remoteStreamRef.current = null;
      remoteScreenStreamRef.current = null;
      setActiveMainId("local");

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        setupPeerConnection(localStreamRef.current);
      }
    });

    return () => {
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("chat-message");
      socket.off("mute-status");
      socket.off("user-left");
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });
      localStreamRef.current = stream;
      setupPeerConnection(stream);
      socket.emit("join-room", ROOM_ID);
      setStreamActive(true);
    } catch (error) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = fallbackStream;
        setupPeerConnection(fallbackStream);
        socket.emit("join-room", ROOM_ID);
        setStreamActive(true);
      } catch (fallbackError) {}
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = event.streams[0];
        setHasRemoteUser(true);
        setActiveMainId("remote");
      } else if (event.streams[0].id !== remoteStreamRef.current.id) {
        remoteScreenStreamRef.current = event.streams[0];
        setIsRemoteScreenSharing(true);
        setActiveMainId("remoteScreen");

        event.streams[0].onremovetrack = () => {
          setIsRemoteScreenSharing(false);
          remoteScreenStreamRef.current = null;
          if (remoteScreenVideoRef.current)
            remoteScreenVideoRef.current.srcObject = null;
          setActiveMainId("remote");
        };
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
        socket.emit("mute-status", {
          roomId: ROOM_ID,
          isMuted: !audioTrack.enabled,
        });
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

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => stopScreenShare();

        if (peerConnectionRef.current) {
          screenSenderRef.current = peerConnectionRef.current.addTrack(
            screenTrack,
            screenStream,
          );
          await createOffer();
        }

        localScreenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        setActiveMainId("localScreen");
      } catch (error) {}
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (screenSenderRef.current && peerConnectionRef.current) {
      peerConnectionRef.current.removeTrack(screenSenderRef.current);
      screenSenderRef.current = null;
      await createOffer();
    }
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
    }
    if (localScreenVideoRef.current)
      localScreenVideoRef.current.srcObject = null;

    setIsScreenSharing(false);
    setActiveMainId(hasRemoteUser ? "remote" : "local");
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit("chat-message", { roomId: ROOM_ID, message: chatInput });
    setChatMessages((prev) => [...prev, { sender: "me", text: chatInput }]);
    setChatInput("");
  };

  const leaveCall = () => {
    socket.emit("leave-room", ROOM_ID);

    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    if (localScreenStreamRef.current)
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();

    setStreamActive(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsRemoteScreenSharing(false);
    setChatMessages([]);
    setHasRemoteUser(false);
    setActiveMainId("local");
    setIsChatOpen(false);

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    localScreenStreamRef.current = null;
    remoteScreenStreamRef.current = null;
    screenSenderRef.current = null;
  };

  const streamsConfig: StreamConfig[] = [
    {
      id: "local",
      active: streamActive,
      ref: localVideoRef,
      isMirror: true,
      isMuted: isMuted,
      label: "You",
    },
    {
      id: "remote",
      active: hasRemoteUser,
      ref: remoteVideoRef,
      isMirror: false,
      isMuted: isRemoteMuted,
      label: "Remote User",
    },
    {
      id: "localScreen",
      active: isScreenSharing,
      ref: localScreenVideoRef,
      isMirror: false,
      isMuted: false,
      label: "Your Screen",
    },
    {
      id: "remoteScreen",
      active: isRemoteScreenSharing,
      ref: remoteScreenVideoRef,
      isMirror: false,
      isMuted: false,
      label: "Remote Screen",
    },
  ];

  const activeStreams = streamsConfig.filter((s) => s.active);

  useEffect(() => {
    if (streamActive && !activeStreams.find((s) => s.id === activeMainId)) {
      if (isRemoteScreenSharing) setActiveMainId("remoteScreen");
      else if (isScreenSharing) setActiveMainId("localScreen");
      else if (hasRemoteUser) setActiveMainId("remote");
      else setActiveMainId("local");
    }
  }, [
    activeStreams.length,
    activeMainId,
    hasRemoteUser,
    isScreenSharing,
    isRemoteScreenSharing,
    streamActive,
  ]);

  return (
    <div className="app-container">
      {notification && <div className="notification-toast">{notification}</div>}

      {chatNotification && (
        <div className="chat-toast">
          <strong>{chatNotification.sender}:</strong> {chatNotification.text}
        </div>
      )}

      <div className="main-content">
        <VideoArea
          streamActive={streamActive}
          activeStreams={activeStreams}
          activeMainId={activeMainId}
          setActiveMainId={setActiveMainId}
          startCamera={startCamera}
        />

        {streamActive && isChatOpen && (
          <ChatPanel
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendMessage={sendMessage}
            closeChat={() => setIsChatOpen(false)}
          />
        )}
      </div>

      {streamActive && (
        <ControlsBar
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          isChatOpen={isChatOpen}
          hasUnreadChat={hasUnreadChat}
          toggleMic={toggleMic}
          toggleCamera={toggleCamera}
          toggleScreenShare={toggleScreenShare}
          setIsChatOpen={setIsChatOpen}
          leaveCall={leaveCall}
        />
      )}
    </div>
  );
}

export default App;
