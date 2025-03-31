module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
  
      // Handle video call signaling
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
      });
  
      socket.on('signal', (data) => {
        io.to(data.userID).emit('signal', {
          id: data.callerID,
          signal: data.signal
        });
      });
  
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        io.emit('user-disconnected', socket.id);
      });
    });
  };
  