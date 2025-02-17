import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

const Chat = ({ appointmentId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/messages/${appointmentId}`);
      setMessages(response.data);
    };
    fetchMessages();

    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => socket.off('receive-message');
  }, [appointmentId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      appointmentId,
      sender: localStorage.getItem('userId'),
      content: newMessage,
      timestamp: new Date()
    };

    socket.emit('send-message', messageData);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === localStorage.getItem('userId') ? 'sent' : 'received'}`}>
            <p>{msg.content}</p>
            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;