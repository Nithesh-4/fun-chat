module.exports = function (fastify, io) {
  const { prisma, cache } = fastify;

  // Use JWT authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    // Clean token if Bearer prefix is used
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    try {
      const decoded = fastify.jwt.verify(cleanToken);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    fastify.log.info(`Socket connected: ${socket.id} for user ${userId}`);

    // Join personal room for targeting user devices
    socket.join(`user:${userId}`);

    // Mark as online in Redis/cache
    const presenceKey = `presence:${userId}`;
    
    // Multi-device support: count active connections for this user
    let userSockets = await io.in(`user:${userId}`).fetchSockets();
    const isFirstConnection = userSockets.length <= 1;

    if (isFirstConnection) {
      await cache.set(presenceKey, 'online');
      
      // Update DB status to null for lastSeenAt since user is currently online
      await prisma.profile.update({
        where: { userId },
        data: { lastSeenAt: null }
      }).catch(err => fastify.log.error(`DB error updating lastSeenAt: ${err.message}`));

      // Notify friends of online status
      await notifyFriendsPresence(userId, 'online');
    }

    // Handle manual disconnect
    socket.on('disconnect', async () => {
      fastify.log.info(`Socket disconnected: ${socket.id} for user ${userId}`);
      
      userSockets = await io.in(`user:${userId}`).fetchSockets();
      const isLastConnection = userSockets.length === 0;

      if (isLastConnection) {
        const lastSeen = new Date();
        await cache.del(presenceKey);
        
        // Update last seen in DB
        await prisma.profile.update({
          where: { userId },
          data: { lastSeenAt: lastSeen }
        }).catch(err => fastify.log.error(`DB error updating lastSeenAt: ${err.message}`));

        // Notify friends of offline status
        await notifyFriendsPresence(userId, 'offline', lastSeen);
      }
    });

    // Helper: Notify friends of presence updates
    async function notifyFriendsPresence(uid, status, lastSeen = null) {
      try {
        // Find accepted friends
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { requesterId: uid, status: 'ACCEPTED' },
              { addresseeId: uid, status: 'ACCEPTED' }
            ]
          }
        });

        const friendIds = friendships.map(f => f.requesterId === uid ? f.addresseeId : f.requesterId);

        friendIds.forEach(friendId => {
          // Emit to friend's room
          io.to(`user:${friendId}`).emit('presence:update', {
            userId: uid,
            status, // 'online' or 'offline'
            lastSeen: lastSeen ? lastSeen.toISOString() : null
          });
        });
      } catch (err) {
        fastify.log.error(`Error notifying friends of presence: ${err.message}`);
      }
    }
  });
};
