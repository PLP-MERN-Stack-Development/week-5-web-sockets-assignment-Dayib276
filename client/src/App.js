import React, { useState, useEffect, useRef } from "react";
import socket from "./socket/socket";
import './index.css';

function App() {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const messageEndRef = useRef(null);

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("user_list", setUsers);
    socket.on("typing_users", setTypingUsers);
    return () => {
      socket.off("receive_message");
      socket.off("user_list");
      socket.off("typing_users");
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit("user_join", username);
      setIsJoined(true);
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      socket.emit("send_message", { message });
      setMessage("");
      socket.emit("typing", false);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", !!e.target.value);
  };

  return (
    <div style={{ maxWidth: 500, margin: "auto", padding: 20 }}>
      {!isJoined ? (
        <div>
          <h2>Join Chat</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      ) : (
        <div>
          <h2>Global Chat Room</h2>
          <div style={{ border: "1px solid #ccc", height: 300, overflowY: "auto", marginBottom: 10 }}>
            {messages.map((msg) => (
              <div key={msg.id}>
                <b>{msg.sender}</b>: {msg.message} <span style={{ fontSize: 10, color: "#888" }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
          <div>
            {typingUsers.length > 0 && (
              <div style={{ fontStyle: "italic", color: "#888" }}>
                {typingUsers.join(", ")} typing...
              </div>
            )}
          </div>
          <input
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message"
            style={{ width: "80%" }}
          />
          <button onClick={handleSend}>Send</button>
          <div style={{ marginTop: 10 }}>
            <b>Online Users:</b> {users.map((u) => u.username).join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
