const chatController = require('../Controllers/chatCont.js');

module.exports = function chatSocket(io) {
    //connecting event handler 
    io.on('connection', (socket) => {
        console.log(`New connection ${socket.id}`);
        const userId = socket.user?.userId;
        if (!userId) {
            console.log('User not authenticated for chat socket');
            return;
        }

        //initializing chat for users that are connected 
        chatController.initializeChat(io, socket, String(userId));

        //message events 
        socket.on('sendMessage', (data) => {
            console.log(`Message received from ${userId}: ${data.receiverId}`);
            chatController.sendMessage(io, socket, data);
        });

        //message received acknowledgement
        socket.on('messageReceived', (data) => {
            console.log(`Message received from ${userId}: ${data.receiverId}`);
            chatController.handleMessageReceived(socket, data);
        });

        socket.on('typing', (data) => {
            chatController.handleTyping(socket, data);
        });

        socket.on('stop_typing', (data) => {
            chatController.handleTyping(socket, { ...data, isTyping: false });
        });

        //chat history 
        socket.on('getChatHistory', (data) => {
            chatController.getChatHistory(socket, data);
        });

        //error handling 
        socket.on('error', (error) => {
            console.error(`Socket error for user ${userId}:`, error);
            socket.emit('error', { message: 'An error occurred' });
        });

        //disconnecting event handler 
        socket.on('disconnect', () => {
            console.log(`User ${userId} disconnected`);
            chatController.handleDisconnect(io, socket);
        });
    });
};



