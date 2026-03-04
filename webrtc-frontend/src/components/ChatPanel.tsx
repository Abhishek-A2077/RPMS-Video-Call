import React, { FormEvent } from "react";
import type { ChatMessage } from "../types";
import { XIcon } from "./Icons";

interface ChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  sendMessage: (e: FormEvent) => void;
  closeChat: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  sendMessage,
  closeChat,
}) => {
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>In-call messages</span>
        <button onClick={closeChat} className="chat-close-btn">
          <XIcon />
        </button>
      </div>
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
  );
};
