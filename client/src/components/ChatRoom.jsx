import React, { useState, useEffect, useRef } from "react";
import socket from "../socket/socket";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ChatRoom = () => {
  // Authentication
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [error, setError] = useState("");
  // Chat
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [privateTo, setPrivateTo] = useState("");
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState("");
  const [file, setFile] = useState(null);
  const [reactions, setReactions] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef(null);

  // Authentication handlers
  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password });
      if (res.data.success) {
        setIsLoggedIn(true);
        socket.emit("user_join", username);
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err) {
      setError("Login error");
    }
    setLoading(false);
  };
  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { username, password });
      if (res.data.success) {
        setIsLoggedIn(true);
        socket.emit("user_join", username);
      } else {
        setError(res.data.message || "Register failed");
      }
    } catch (err) {
      setError("Register error");
    }
    setLoading(false);
  };

  // Socket events
  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("user_list", setUsers);
    socket.on("typing_users", setTypingUsers);
    socket.on("user_left", (user) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id));
    });
    socket.on("private_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("receive_file", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("message_reacted", (msg) => {
      setReactions((prev) => ({ ...prev, [msg._id]: msg.reactions }));
    });
    socket.on("message_read", (msg) => {
      // Optionally update read status
    });
    socket.on("unread_count", setUnreadCount);
    socket.on("search_results", setSearchResults);
    return () => {
      socket.off("receive_message");
      socket.off("user_list");
      socket.off("typing_users");
      socket.off("user_left");
      socket.off("private_message");
      socket.off("receive_file");
      socket.off("message_reacted");
      socket.off("message_read");
      socket.off("unread_count");
      socket.off("search_results");
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Room/channel logic
  useEffect(() => {
    axios.get(`${API_URL}/rooms`).then((res) => setRooms(res.data));
  }, []);
  const handleJoinRoom = (roomId) => {
    setCurrentRoom(roomId);
    socket.emit("join_room", { roomId, username });
  };

  // Message handlers
  const handleSend = () => {
    if (message.trim()) {
      socket.emit("send_message", { message, roomId: currentRoom, to: privateTo });
      setMessage("");
      socket.emit("typing", false);
    }
  };
  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", !!e.target.value);
  };
  const handleSendPrivate = () => {
    if (message.trim() && privateTo) {
      socket.emit("private_message", { to: privateTo, message });
      setMessage("");
    }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sender", username);
    formData.append("senderId", socket.id);
    formData.append("roomId", currentRoom);
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/messages/upload`, formData);
      socket.emit("send_file", { ...res.data, fileName: file.name });
    } catch (err) {
      setError("File upload failed");
    }
    setLoading(false);
  };
  const handleReact = (messageId, reaction) => {
    socket.emit("react_message", { messageId, reaction });
  };
  const handleRead = (messageId) => {
    socket.emit("read_message", { messageId, userId: socket.id });
  };
  const handleSearch = () => {
    socket.emit("search_messages", search);
  };

  // Responsive UI and error/loading states
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto p-4 bg-white rounded shadow mt-10">
        <h2 className="text-xl font-bold mb-4">{registerMode ? "Register" : "Login"}</h2>
        <input className="border p-2 w-full mb-2" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
        <input className="border p-2 w-full mb-2" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button className="bg-blue-500 text-white px-4 py-2 rounded mr-2" onClick={registerMode ? handleRegister : handleLogin} disabled={loading}>
          {loading ? "Loading..." : registerMode ? "Register" : "Login"}
        </button>
        <button className="text-blue-500 underline" onClick={() => setRegisterMode(!registerMode)}>
          {registerMode ? "Already have an account? Login" : "No account? Register"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <b>Online Users:</b> {users.map(u => u.username).join(", ")}
        </div>
        <div>
          <b>Unread:</b> {unreadCount}
        </div>
      </div>
      <div className="mb-2">
        <b>Rooms:</b>
        {rooms.map(room => (
          <button key={room._id} className={`ml-2 px-2 py-1 rounded ${currentRoom === room._id ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => handleJoinRoom(room._id)}>
            {room.name}
          </button>
        ))}
      </div>
      <div className="mb-2">
        <input className="border p-1 w-1/2" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." />
        <button className="bg-green-500 text-white px-2 py-1 rounded ml-2" onClick={handleSearch}>Search</button>
      </div>
      <div className="border h-64 overflow-y-auto mb-2 bg-white p-2 rounded">
        {(search ? searchResults : messages).map(msg => (
          <div key={msg._id || msg.id} className="mb-2">
            <b>{msg.sender}</b>: {msg.message}
            {msg.fileUrl && <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 ml-2">[File]</a>}
            <span className="text-xs text-gray-500 ml-2">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            <span className="ml-2 text-xs text-green-500">{msg.isPrivate ? "(Private)" : ""}</span>
            <span className="ml-2 text-xs text-purple-500">{msg.room ? `(Room: ${msg.room})` : ""}</span>
            <span className="ml-2 text-xs text-orange-500">{msg.readBy && msg.readBy.length ? `Read by ${msg.readBy.length}` : ""}</span>
            <span className="ml-2">
              {reactions[msg._id]?.map((r, i) => <span key={i} className="mr-1">{r}</span>)}
              {["👍", "❤️", "😂", "😮"].map(r => <button key={r} className="ml-1" onClick={() => handleReact(msg._id, r)}>{r}</button>)}
            </span>
            <button className="ml-2 text-xs text-blue-700 underline" onClick={() => handleRead(msg._id)}>Mark as read</button>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      {typingUsers.length > 0 && (
        <div className="italic text-gray-500 mb-2">{typingUsers.join(", ")} typing...</div>
      )}
      <div className="flex mb-2">
        <input className="border p-2 w-full" value={message} onChange={handleTyping} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Type a message" />
        <button className="bg-blue-500 text-white px-4 py-2 rounded ml-2" onClick={handleSend}>Send</button>
      </div>
      <div className="mb-2">
        <input className="border p-2 w-1/2" value={privateTo} onChange={e => setPrivateTo(e.target.value)} placeholder="Send private to (username)" />
        <button className="bg-purple-500 text-white px-2 py-1 rounded ml-2" onClick={handleSendPrivate}>Send Private</button>
      </div>
      <div className="mb-2">
        <input type="file" onChange={handleFileUpload} />
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {loading && <div className="text-blue-500">Loading...</div>}
    </div>
  );
};

export default ChatRoom;
