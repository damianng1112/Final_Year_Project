module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Chat socket connected: ${socket.id}`);
    
    // Handle joining a specific chat room (based on appointmentId)
    socket.on('join-chat', (appointmentId) => {
      socket.join(appointmentId);
      console.log(`User ${socket.id} joined chat room: ${appointmentId}`);
    });
    
    // Handle leaving a chat room
    socket.on('leave-chat', (appointmentId) => {
      socket.leave(appointmentId);
      console.log(`User ${socket.id} left chat room: ${appointmentId}`);
    });

    // Handle sending messages to a room
    socket.on('send-message', (messageData) => {
      try {
        const { room, ...message } = messageData;
        
        // Broadcast the message to everyone in the room except the sender
        socket.to(room).emit('receive-message', message);
        
        console.log(`Message sent to room ${room} by ${socket.id}`);
      } catch (error) {
        console.error('Error handling chat message:', error);
      }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log(`Chat socket disconnected: ${socket.id}`);
    });
  });
};