import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

const Chat = ({ appointmentId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    // Fetch logged-in user details
    const fetchUser = async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/user/${userId}`);
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user details:', error);
        } finally {
          setLoading(false); 
        }
      } else {
        setLoading(false); 
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/messages/${appointmentId}`);
        const messages = response.data;
        // Map through each message and fetch the sender's name by their ID
        const messagesWithUser = await Promise.all(messages.map(async (msg) => {
          // Check if sender's info is available in message
          let sender = msg.sender || { name: "Unknown", _id: null };
          
          // If sender is just an ID, fetch the user's full info
          if (sender._id) {
            try {
              const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/user/${sender._id}`);
              sender = { ...sender, name: userResponse.data.name };
            } catch (error) {
              console.error('Error fetching user data:', error);
              sender = { ...sender, name: "Unknown" };
            }
          }

          return { ...msg, sender };
        }));

        setMessages(messagesWithUser);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchUser();
    fetchMessages();
    
    socket.on('receive-message', (message) => {
      setMessages((prevMessages) => {
        if (!prevMessages.some((msg) => msg._id === message._id)) {
          return [...prevMessages, message];
        }
        return prevMessages; 
      });
    });

    return () => socket.off('receive-message');
  }, [appointmentId]);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageData = {
      appointmentId,
      sender: user._id,
      content: newMessage,
      timestamp: new Date()
    };

    try {
      // Save message to backend
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/messages`, messageData);
      const savedMessage = response.data;

      // Emit message to socket
      socket.emit('send-message', savedMessage);

      // Update UI
      setMessages(prev => [
        ...prev, 
        { ...savedMessage, sender: { name: user.name, _id: user._id } }
      ]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-container bg-gray-100 p-4 rounded-lg shadow-md">
      <div className="messages h-80 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`message p-2 m-1 rounded ${msg.sender === user?._id ? "sent" : "received"}`}>
            <p>
              <strong>{msg.sender?.name || "Unknown"}:</strong> {msg.content}
            </p>
            <span className="text-xs text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 mt-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Send</button>
      </form>
    </div>
  );
};

export default Chat;
