import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

// Create a socket connection
const socket = io.connect(process.env.REACT_APP_SOCKET_URL);

const Chat = ({ appointmentId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Scroll to bottom of chat whenever messages updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initial setup: fetch user data, appointment info, and past messages
  useEffect(() => {
    const setupChat = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          navigate('/');
          return;
        }

        // Fetch current user data
        const userResponse = await api.get(`/api/users/user/${userId}`);
        setUser(userResponse.data);

        // Fetch appointment details to get the other user
        const appointmentResponse = await api.get(
          `/api/appointments/detail/${appointmentId}`
        );
        
        const appointment = appointmentResponse.data;
        const otherUserId = appointment.doctor._id === userId ? appointment.patient._id : appointment.doctor._id;
        
        // Fetch other user's data
        const otherUserResponse = await api.get(`/api/users/user/${otherUserId}`);
        setOtherUser(otherUserResponse.data);

        // Fetch previous messages
        const messagesResponse = await api.get(`/api/messages/${appointmentId}`);
        setMessages(messagesResponse.data);
      } catch (err) {
        console.error('Error setting up chat:', err);
        setError('Failed to load chat. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    setupChat();
  }, [appointmentId, navigate]);

  // Set up socket connection and event listeners
  useEffect(() => {
    if (!appointmentId) return;

    // Join the appointment's room
    socket.emit('join-chat', appointmentId);

    // Listen for new messages
    const handleNewMessage = (message) => {
      console.log('New message received:', message);
      // Only add the message if it's not already in our list (prevents duplicates)
      setMessages(prevMessages => {
        if (!prevMessages.some(msg => msg._id === message._id)) {
          return [...prevMessages, message];
        }
        return prevMessages;
      });
    };

    socket.on('receive-message', handleNewMessage);

    // Clean up on component unmount
    return () => {
      socket.off('receive-message', handleNewMessage);
      socket.emit('leave-chat', appointmentId);
    };
  }, [appointmentId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      // Create the message object
      const messageData = {
        appointmentId,
        sender: user._id,
        content: newMessage,
        timestamp: new Date()
      };

      // Save message to backend
      const response = await api.post(`/api/messages`, messageData);
      const savedMessage = response.data;

      // Add sender name and details for UI display
      const messageWithSender = {
        ...savedMessage,
        sender: {
          _id: user._id,
          name: user.name
        }
      };

      // First update local state - this immediately shows the message for the sender
      setMessages(prevMessages => [...prevMessages, messageWithSender]);

      // Then emit message to socket for other users
      socket.emit('send-message', {
        ...messageWithSender,
        room: appointmentId
      });

      // Clear input field
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-100 p-4 rounded-lg text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-100 h-screen flex flex-col">
      {/* Chat header */}
      <div className="bg-white p-3 rounded-t-lg shadow-md flex items-center">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
          {otherUser?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="font-semibold">{otherUser?.name || 'Chat'}</h2>
          <p className="text-xs text-gray-500">{otherUser?.role === 'doctor' ? 'Doctor' : 'Patient'}</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="ml-auto bg-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300"
        >
          Back
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto bg-white p-4 shadow-inner mb-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 italic">No messages yet. Send the first one!</p>
          ) : (
            messages.map((msg, index) => {
              const isCurrentUser = msg.sender?._id === user?._id;
              return (
                <div 
                  key={index} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                      isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {!isCurrentUser && (
                      <p className="text-xs font-semibold mb-1">{msg.sender?.name || 'Unknown'}</p>
                    )}
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-70 text-right mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <form onSubmit={sendMessage} className="bg-white p-3 rounded-b-lg shadow-md flex items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button 
          type="submit" 
          className="bg-blue-500 text-white p-2 px-4 rounded-r hover:bg-blue-600"
          disabled={!newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;