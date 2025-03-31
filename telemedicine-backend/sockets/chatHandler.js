module.exports = (io) => {
    io.on('connection', (socket) => {
      console.log(`Chat socket connected: ${socket.id}`);
  
      // Handle chat messages
      socket.on('send-message', async (messageData) => {
        try {
          socket.to(messageData.appointmentId).emit('receive-message', messageData);
        } catch (error) {
          console.error('Error sending message via socket:', error);
        }
      });
  
      // Handle user disconnection
      socket.on('disconnect', () => {
        console.log(`Chat socket disconnected: ${socket.id}`);
      });
    });
  };
  