module.exports = async function (fastify, opts) {
  const { prisma, cache } = fastify;

  // Protect all user routes except public lookup if needed (let's authenticate all for security)
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /users/:username
  fastify.get('/:username', async (request, reply) => {
    const { username } = request.params;
    const reqUserId = request.user.userId;

    try {
      const targetProfile = await prisma.profile.findUnique({
        where: { username },
        include: {
          user: {
            include: {
              sentFriendships: true,
              receivedFriendships: true
            }
          }
        }
      });

      if (!targetProfile) {
        return reply.status(404).send({ error: 'Not Found', message: 'User profile not found.' });
      }

      const targetUserId = targetProfile.userId;

      // Determine friendship status
      let friendshipStatus = null;
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: reqUserId, addresseeId: targetUserId },
            { requesterId: targetUserId, addresseeId: reqUserId }
          ]
        }
      });

      if (friendship) {
        friendshipStatus = friendship.status; // PENDING, ACCEPTED, BLOCKED
      }

      // Calculate mutual friends
      // A user is a friend if they have an ACCEPTED status in friendships
      const getFriends = async (uid) => {
        const f1 = await prisma.friendship.findMany({
          where: { requesterId: uid, status: 'ACCEPTED' },
          select: { addresseeId: true }
        });
        const f2 = await prisma.friendship.findMany({
          where: { addresseeId: uid, status: 'ACCEPTED' },
          select: { requesterId: true }
        });
        return new Set([...f1.map(f => f.addresseeId), ...f2.map(f => f.requesterId)]);
      };

      const myFriends = await getFriends(reqUserId);
      const theirFriends = await getFriends(targetUserId);
      const mutualFriendsIds = [...myFriends].filter(id => theirFriends.has(id));

      const mutualFriends = await prisma.profile.findMany({
        where: { userId: { in: mutualFriendsIds } },
        select: {
          username: true,
          displayName: true,
          avatarUrl: true
        }
      });

      // Get real-time online status from Cache
      const onlineKey = `presence:${targetUserId}`;
      const isOnline = await cache.get(onlineKey);

      return {
        profile: {
          userId: targetProfile.userId,
          username: targetProfile.username,
          displayName: targetProfile.displayName,
          bio: targetProfile.bio,
          avatarUrl: targetProfile.avatarUrl,
          gender: targetProfile.gender,
          lastSeenAt: targetProfile.lastSeenAt,
          isOnline: !!isOnline
        },
        friendshipStatus,
        mutualFriends
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // PATCH /users/me (Update profile)
  fastify.patch('/me', async (request, reply) => {
    const userId = request.user.userId;
    const { displayName, bio, avatarUrl, gender, username } = request.body;

    try {
      const currentProfile = await prisma.profile.findUnique({
        where: { userId }
      });

      if (!currentProfile) {
        return reply.status(404).send({ error: 'Not Found', message: 'Profile not found.' });
      }

      const updateData = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (bio !== undefined) updateData.bio = bio;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (gender !== undefined) updateData.gender = gender;

      // Handle username change with limits
      if (username !== undefined && username !== currentProfile.username) {
        // Validate regex
        const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
        if (!usernameRegex.test(username)) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: 'Username must be 4-20 characters, containing only letters, numbers, or underscores.'
          });
        }

        // Check if taken
        const taken = await prisma.profile.findUnique({ where: { username } });
        if (taken) {
          return reply.status(409).send({ error: 'Conflict', message: 'Username is already taken.' });
        }

        // Check username change limits (2 free, then 1 per 30 days)
        const history = await prisma.usernameHistory.findMany({
          where: { userId },
          orderBy: { changedAt: 'desc' }
        });

        if (history.length >= 2) {
          const lastChange = history[0].changedAt;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          if (lastChange > thirtyDaysAgo) {
            const nextEligibleDate = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
            return reply.status(429).send({
              error: 'Too Many Requests',
              message: `Username changes are limited to 2 free changes, then once every 30 days.`,
              remainingFreeChanges: 0,
              nextEligibleDate
            });
          }
        }

        // Execute username change and save history
        await prisma.$transaction(async (tx) => {
          await tx.usernameHistory.create({
            data: {
              userId,
              oldUsername: currentProfile.username
            }
          });
          await tx.profile.update({
            where: { userId },
            data: { username }
          });
        });
      }

      // Update remaining profile fields
      if (Object.keys(updateData).length > 0) {
        await prisma.profile.update({
          where: { userId },
          data: updateData
        });
      }

      // Retrieve username changes state
      const updatedHistory = await prisma.usernameHistory.findMany({ where: { userId } });
      const remainingFreeChanges = Math.max(0, 2 - updatedHistory.length);
      let nextEligibleDate = null;
      if (updatedHistory.length >= 2) {
        const lastChange = updatedHistory.sort((a, b) => b.changedAt - a.changedAt)[0].changedAt;
        nextEligibleDate = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const profile = await prisma.profile.findUnique({ where: { userId } });

      return {
        profile,
        remainingFreeChanges,
        nextEligibleDate
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // GET /users/me/username-status (Check cooldown / free changes remaining)
  fastify.get('/me/username-status', async (request, reply) => {
    const userId = request.user.userId;
    try {
      const history = await prisma.usernameHistory.findMany({
        where: { userId },
        orderBy: { changedAt: 'desc' }
      });
      const remainingFreeChanges = Math.max(0, 2 - history.length);
      let nextEligibleDate = null;
      if (history.length >= 2) {
        const lastChange = history[0].changedAt;
        nextEligibleDate = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      return { remainingFreeChanges, nextEligibleDate };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // Admin Middleware helper
  const verifyAdmin = async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Admin access required.' });
    }
  };

  // GET /users/admin/stats
  fastify.get('/admin/stats', { preHandler: [verifyAdmin] }, async (request, reply) => {
    try {
      const totalUsers = await prisma.user.count();
      const totalMessages = await prisma.message.count();
      const totalFriendships = await prisma.friendship.count();
      return { totalUsers, totalMessages, totalFriendships };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // GET /users/admin/users
  fastify.get('/admin/users', { preHandler: [verifyAdmin] }, async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        include: { profile: true }
      });
      return users.map(u => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        country: u.country,
        createdAt: u.createdAt,
        role: u.role,
        profile: u.profile ? {
          username: u.profile.username,
          displayName: u.profile.displayName,
          bio: u.profile.bio,
          avatarUrl: u.profile.avatarUrl
        } : null
      }));
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });
};
