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
      
      // Add user to room tracking
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId).add(socket.id);
      
      const usersInRoom = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);
      
      // Notify the joining user about existing users in the room
      if (usersInRoom.length > 0) {
        console.log(`Notifying ${socket.id} about existing users: ${usersInRoom.join(', ')}`);
        socket.emit('existing-users', usersInRoom);
      }
      
      // Notify other users in the room that a new user has connected
      socket.to(roomId).emit('user-connected', socket.id);
      
      console.log(`Room ${roomId} now has ${rooms.get(roomId).size} users`);
    });
  
    // Handle connection ready signal
    socket.on('ready-to-connect', (roomId) => {
      console.log(`User ${socket.id} is ready to connect in room: ${roomId}`);
      socket.to(roomId).emit('peer-ready', socket.id);
    });
  
    // Handle signaling for WebRTC
    socket.on('signal', (data) => {
      console.log(`Signal from ${data.callerID} to ${data.userID}`);
      
      // Forward the signal to the intended recipient
      io.to(data.userID).emit('signal', {
        id: data.callerID,
        signal: data.signal
      });
    });
    
    // Handle user leaving a room
    socket.on('leave-room', (roomId) => {
      console.log(`User ${socket.id} leaving video room: ${roomId}`);
      
      // Remove from tracking
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        if (rooms.get(roomId).size === 0) {
          rooms.delete(roomId);
        }
      }
      
      // Leave the socket.io room
      socket.leave(roomId);
      
      // Broadcast to room that the user has left
      socket.to(roomId).emit('user-disconnected', socket.id);
    });
  
    socket.on('disconnect', () => {
      console.log(`Video socket disconnected: ${socket.id}`);
      
      // Find all rooms this socket was in
      for (const [roomId, users] of rooms.entries()) {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          if (users.size === 0) {
            rooms.delete(roomId);
          }
          
          // Broadcast to room that the user has disconnected
          socket.to(roomId).emit('user-disconnected', socket.id);
        }
      }
    });
  });
};