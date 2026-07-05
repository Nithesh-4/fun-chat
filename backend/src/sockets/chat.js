module.exports = function (fastify, io) {
  const { prisma, cache } = fastify;

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Client joins a specific chat room on opening it
    socket.on('chat:join', ({ chatId }) => {
      if (chatId) {
        socket.join(`room:chat:${chatId}`);
        fastify.log.info(`Socket ${socket.id} joined chat room: room:chat:${chatId}`);
      }
    });

    // Client leaves a specific chat room on closing it
    socket.on('chat:leave', ({ chatId }) => {
      if (chatId) {
        socket.leave(`room:chat:${chatId}`);
        fastify.log.info(`Socket ${socket.id} left chat room: room:chat:${chatId}`);
      }
    });

    // Client sends a new message
    socket.on('chat:message:send', async (payload, callback) => {
      const { chatId, clientTempId, ciphertext, senderKeyId, attachments } = payload;

      if (!chatId || !ciphertext) {
        if (callback) callback({ error: 'Missing chatId or ciphertext' });
        return;
      }

      try {
        // 1. Verify user is member of chat
        const membership = await prisma.chatMember.findUnique({
          where: {
            chatId_userId: { chatId, userId }
          }
        });

        if (!membership) {
          if (callback) callback({ error: 'Unauthorized: Not a member of this chat' });
          return;
        }

        // 2. Persist message to PostgreSQL
        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            clientTempId,
            ciphertext,
            senderKeyId: senderKeyId || 'default',
            attachments: attachments && attachments.length > 0 ? {
              create: attachments.map(att => ({
                storageProvider: att.storageProvider || 'cloudinary',
                storageKey: att.storageKey,
                mimeType: att.mimeType,
                sizeBytes: att.sizeBytes
              }))
            } : undefined
          },
          include: {
            attachments: true,
            sender: {
              select: {
                id: true,
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        });

        // 3. Setup message status for all other chat members
        const members = await prisma.chatMember.findMany({
          where: { chatId, userId: { not: userId } }
        });

        const statusPromises = members.map(async (member) => {
          const isOnline = await cache.get(`presence:${member.userId}`);
          const statusVal = isOnline ? 'DELIVERED' : 'DELIVERED'; // Default delivered or pending
          
          await prisma.messageStatus.create({
            data: {
              messageId: message.id,
              userId: member.userId,
              status: statusVal
            }
          });

          // Also notify their general user room so their chat list updates in real-time
          io.to(`user:${member.userId}`).emit('chat:message:notify', {
            chatId,
            message: {
              id: message.id,
              senderId: userId,
              ciphertext: message.ciphertext,
              createdAt: message.createdAt
            }
          });
        });

        await Promise.all(statusPromises);

        // 4. Broadcast the message to the active chat room
        io.to(`room:chat:${chatId}`).emit('chat:message:received', message);

        // 5. Acknowledge message delivery to sender
        if (callback) {
          callback({
            success: true,
            messageId: message.id,
            clientTempId
          });
        }
      } catch (err) {
        fastify.log.error(`Error saving/broadcasting message: ${err.message}`);
        if (callback) callback({ error: 'Server error sending message' });
      }
    });

    // Client typing status
    socket.on('chat:typing:start', ({ chatId }) => {
      if (chatId) {
        socket.to(`room:chat:${chatId}`).emit('chat:typing:start', { chatId, userId });
      }
    });

    socket.on('chat:typing:stop', ({ chatId }) => {
      if (chatId) {
        socket.to(`room:chat:${chatId}`).emit('chat:typing:stop', { chatId, userId });
      }
    });

    // Client reads/views messages (read receipts)
    socket.on('chat:message:read', async ({ chatId, messageIds }) => {
      if (!chatId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) return;

      try {
        // Update statuses to READ for this user
        await prisma.messageStatus.updateMany({
          where: {
            messageId: { in: messageIds },
            userId: userId
          },
          data: {
            status: 'READ'
          }
        });

        // Broadcast read event to the room
        socket.to(`room:chat:${chatId}`).emit('chat:message:read', {
          chatId,
          userId,
          messageIds
        });
      } catch (err) {
        fastify.log.error(`Error updating message status to READ: ${err.message}`);
      }
    });
  });
};
