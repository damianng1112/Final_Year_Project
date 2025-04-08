// telemedicine-backend/sockets/videoCallHandler.js

module.exports = (io) => {
  // Keep track of users in rooms
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log(`Video socket connected: ${socket.id}`);
  
    // Handle joining a specific room for video calls
    socket.on('join-room', (roomId) => {
      console.log(`User ${socket.id} joining video room: ${roomId}`);
      
      // Join the socket.io room
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      
      // Add user to room tracking
      rooms.get(roomId).add(socket.id);
      
      // Get other users in the room (excluding the joining user)
      const usersInRoom = Array.from(rooms.get(roomId))
        .filter(id => id !== socket.id);
      
      console.log(`Room ${roomId} has ${rooms.get(roomId).size} users`);
      console.log(`Notifying ${socket.id} about existing users:`, usersInRoom);
      
      // Notify the joining user about existing users in the room
      if (usersInRoom.length > 0) {
        socket.emit('existing-users', usersInRoom);
      }
      
      // Notify other users in the room that a new user has connected
      socket.to(roomId).emit('user-connected', socket.id);
    });
  
    // Handle connection ready signal
    socket.on('ready-to-connect', (roomId) => {
      console.log(`User ${socket.id} is ready to connect in room: ${roomId}`);
      
      // Send ready signal to all other users in the room
      if (rooms.has(roomId)) {
        Array.from(rooms.get(roomId))
          .filter(id => id !== socket.id)
          .forEach(userId => {
            io.to(userId).emit('peer-ready', socket.id);
          });
      }
    });
  
    // Handle signaling for WebRTC
    socket.on('signal', (data) => {
      try {
        console.log(`Signal from ${data.callerID} to ${data.userID} (type: ${data.signal?.type || 'unknown'})`);
        
        // Forward the signal to the intended recipient
        io.to(data.userID).emit('signal', {
          id: data.callerID,
          signal: data.signal
        });
      } catch (err) {
        console.error('Error handling signal:', err);
      }
    });
    
    // Handle user leaving a room
    socket.on('leave-room', (roomId) => {
      handleUserLeaving(socket.id, roomId);
    });
  
    socket.on('disconnect', () => {
      console.log(`Video socket disconnected: ${socket.id}`);
      
      // Find all rooms this socket was in
      for (const [roomId, users] of rooms.entries()) {
        if (users.has(socket.id)) {
          handleUserLeaving(socket.id, roomId);
        }
      }
    });
    
    // Helper function to handle user leaving logic
    const handleUserLeaving = (userId, roomId) => {
      console.log(`User ${userId} leaving video room: ${roomId}`);
      
      // Remove from tracking
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(userId);
        console.log(`Room ${roomId} now has ${rooms.get(roomId).size} users`);
        
        // Clean up empty rooms
        if (rooms.get(roomId).size === 0) {
          console.log(`Room ${roomId} is now empty, removing`);
          rooms.delete(roomId);
        }
      }
      
      // Broadcast to room that the user has left
      socket.to(roomId).emit('user-disconnected', userId);
    };
  });
};