module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Video socket connected: ${socket.id}`);
  
    // Handle joining a specific room for video calls
    socket.on('join-room', (roomId) => {
      console.log(`User ${socket.id} joining video room: ${roomId}`);
      
      // Join the room
      socket.join(roomId);
      
      // Notify other users in the room that a new user has connected
      socket.to(roomId).emit('user-connected', socket.id);
      
      console.log(`Notified other users in ${roomId} about ${socket.id} connecting`);
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
      socket.leave(roomId);
    });
  
    socket.on('disconnect', () => {
      console.log(`Video socket disconnected: ${socket.id}`);
      
      // Broadcast to all rooms that this user has disconnected
      io.emit('user-disconnected', socket.id);
    });
  });
};