module.exports = async function (fastify, opts) {
  const { prisma } = fastify;

  // Protect all chat and friendship routes
  fastify.addHook('preHandler', fastify.authenticate);

  // --- FRIENDSHIPS ROUTING ---

  // GET /chats/friendships - Get friend list
  fastify.get('/friendships', async (request, reply) => {
    const userId = request.user.userId;
    try {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, status: 'ACCEPTED' },
            { addresseeId: userId, status: 'ACCEPTED' }
          ]
        },
        include: {
          requester: { include: { profile: true } },
          addressee: { include: { profile: true } }
        }
      });

      const friends = friendships.map(f => {
        const friendUser = f.requesterId === userId ? f.addressee : f.requester;
        return {
          friendshipId: f.id,
          userId: friendUser.id,
          username: friendUser.profile.username,
          displayName: friendUser.profile.displayName,
          avatarUrl: friendUser.profile.avatarUrl
        };
      });

      return friends;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // GET /chats/friendships/requests - List pending requests
  fastify.get('/friendships/requests', async (request, reply) => {
    const userId = request.user.userId;
    try {
      const requests = await prisma.friendship.findMany({
        where: {
          addresseeId: userId,
          status: 'PENDING'
        },
        include: {
          requester: { include: { profile: true } }
        }
      });

      return requests.map(r => ({
        friendshipId: r.id,
        requester: {
          userId: r.requester.id,
          username: r.requester.profile.username,
          displayName: r.requester.profile.displayName,
          avatarUrl: r.requester.profile.avatarUrl
        },
        createdAt: r.createdAt
      }));
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /chats/friendships/request - Send request
  fastify.post('/friendships/request', async (request, reply) => {
    const requesterId = request.user.userId;
    const { username } = request.body;

    if (!username) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Target username is required.' });
    }

    try {
      // Find target user profile
      const targetProfile = await prisma.profile.findUnique({
        where: { username }
      });

      if (!targetProfile) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found.' });
      }

      const addresseeId = targetProfile.userId;

      if (requesterId === addresseeId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'You cannot add yourself.' });
      }

      // Check if a friendship record already exists
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId, addresseeId },
            { requesterId: addresseeId, addresseeId: requesterId }
          ]
        }
      });

      if (existing) {
        if (existing.status === 'ACCEPTED') {
          return reply.status(400).send({ error: 'Bad Request', message: 'You are already friends.' });
        }
        if (existing.status === 'PENDING') {
          return reply.status(400).send({ error: 'Bad Request', message: 'Friend request is already pending.' });
        }
        if (existing.status === 'BLOCKED') {
          return reply.status(403).send({ error: 'Forbidden', message: 'Relationship is blocked.' });
        }
      }

      const friendship = await prisma.friendship.create({
        data: {
          requesterId,
          addresseeId,
          status: 'PENDING'
        }
      });

      return { success: true, friendshipId: friendship.id };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /chats/friendships/respond - Accept or reject request
  fastify.post('/friendships/respond', async (request, reply) => {
    const userId = request.user.userId;
    const { friendshipId, action } = request.body; // action: 'ACCEPT' or 'REJECT' or 'BLOCK'

    if (!friendshipId || !action) {
      return reply.status(400).send({ error: 'Validation Error', message: 'friendshipId and action are required.' });
    }

    try {
      const friendship = await prisma.friendship.findUnique({
        where: { id: friendshipId }
      });

      if (!friendship) {
        return reply.status(404).send({ error: 'Not Found', message: 'Friend request not found.' });
      }

      // Verify user is authorized to act on this
      if (action === 'ACCEPT' || action === 'REJECT') {
        if (friendship.addresseeId !== userId) {
          return reply.status(403).send({ error: 'Forbidden', message: 'You are not authorized to respond to this request.' });
        }
      }

      if (action === 'ACCEPT') {
        await prisma.friendship.update({
          where: { id: friendshipId },
          data: { status: 'ACCEPTED' }
        });
        return { success: true, message: 'Friend request accepted.' };
      } else if (action === 'REJECT') {
        await prisma.friendship.delete({
          where: { id: friendshipId }
        });
        return { success: true, message: 'Friend request rejected.' };
      } else if (action === 'BLOCK') {
        await prisma.friendship.update({
          where: { id: friendshipId },
          data: { status: 'BLOCKED' }
        });
        return { success: true, message: 'User blocked.' };
      }

      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid action.' });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // --- CHATS ROUTING ---

  // GET /chats - Get active chats list for user
  fastify.get('/', async (request, reply) => {
    const userId = request.user.userId;
    try {
      const members = await prisma.chatMember.findMany({
        where: { userId },
        include: {
          chat: {
            include: {
              members: {
                include: {
                  user: { include: { profile: true } }
                }
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      const chats = members.map(m => {
        const chat = m.chat;
        const lastMessage = chat.messages[0] || null;

        // For direct chats, find the other member
        let chatName = 'Group Chat';
        let chatAvatar = null;
        if (chat.type === 'DIRECT') {
          const otherMember = chat.members.find(member => member.userId !== userId);
          if (otherMember) {
            chatName = otherMember.user.profile.displayName;
            chatAvatar = otherMember.user.profile.avatarUrl;
          }
        }

        return {
          id: chat.id,
          type: chat.type,
          name: chatName,
          avatar: chatAvatar,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            ciphertext: lastMessage.ciphertext,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId
          } : null
        };
      });

      return chats;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /chats - Create a new chat session (direct or group)
  fastify.post('/', async (request, reply) => {
    const creatorId = request.user.userId;
    const { type, recipientId, memberIds } = request.body; // type: 'DIRECT' or 'GROUP'

    try {
      if (type === 'DIRECT') {
        if (!recipientId) {
          return reply.status(400).send({ error: 'Validation Error', message: 'recipientId is required for direct chats.' });
        }

        // Check if direct chat already exists between the two users
        const existingChat = await prisma.chat.findFirst({
          where: {
            type: 'DIRECT',
            AND: [
              { members: { some: { userId: creatorId } } },
              { members: { some: { userId: recipientId } } }
            ]
          }
        });

        if (existingChat) {
          return existingChat;
        }

        // Create new direct chat
        const newChat = await prisma.chat.create({
          data: {
            type: 'DIRECT',
            createdBy: creatorId,
            members: {
              create: [
                { userId: creatorId, role: 'admin' },
                { userId: recipientId, role: 'member' }
              ]
            }
          }
        });
        return newChat;
      } else {
        // Group chat
        const allMembers = [creatorId, ...(memberIds || [])];
        const newChat = await prisma.chat.create({
          data: {
            type: 'GROUP',
            createdBy: creatorId,
            members: {
              create: allMembers.map(uid => ({
                userId: uid,
                role: uid === creatorId ? 'admin' : 'member'
              }))
            }
          }
        });
        return newChat;
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // GET /chats/:chatId/messages - Cursor-based message history
  fastify.get('/:chatId/messages', async (request, reply) => {
    const { chatId } = request.params;
    const { before, limit } = request.query;
    const pageSize = parseInt(limit) || 50;

    try {
      const queryOptions = {
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        include: {
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
      };

      if (before) {
        queryOptions.cursor = { id: before };
        queryOptions.skip = 1; // Skip the exact cursor message
      }

      const messages = await prisma.message.findMany(queryOptions);
      return messages.reverse(); // Return in chronological order
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // GET /chats/prekey/:userId - Fetch pre-key bundle for a user to start E2E session
  fastify.get('/prekey/:userId', async (request, reply) => {
    const { userId } = request.params;
    try {
      const bundle = await prisma.preKeyBundle.findFirst({
        where: { userId }
      });

      if (!bundle) {
        return reply.status(404).send({ error: 'Not Found', message: 'Pre-key bundle not found for user.' });
      }

      return bundle;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /chats/prekey - Upload / update own pre-key bundle
  fastify.post('/prekey', async (request, reply) => {
    const userId = request.user.userId;
    const { deviceId, identityPublicKey, signedPreKeyId, signedPreKey, signature, oneTimePreKeys } = request.body;

    try {
      const bundle = await prisma.preKeyBundle.upsert({
        where: {
          userId_deviceId: { userId, deviceId }
        },
        update: {
          identityPublicKey,
          signedPreKeyId,
          signedPreKey,
          signature,
          oneTimePreKeys: JSON.stringify(oneTimePreKeys)
        },
        create: {
          userId,
          deviceId,
          identityPublicKey,
          signedPreKeyId,
          signedPreKey,
          signature,
          oneTimePreKeys: JSON.stringify(oneTimePreKeys)
        }
      });

      return { success: true, bundleId: bundle.id };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });
};
