const bcrypt = require('bcryptjs');

module.exports = async function (fastify, opts) {
  const { prisma } = fastify;

  // POST /auth/register
  fastify.post('/register', async (request, reply) => {
    const {
      email,
      phone,
      password,
      dateOfBirth,
      country,
      username,
      displayName,
      gender
    } = request.body;

    // Validate age (must be 18+)
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Invalid date of birth format.' });
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      return reply.status(403).send({ error: 'Age Restriction', message: 'Registration is restricted to adults (18+) only.' });
    }

    // Validate username rules: 4-20 chars, letters/numbers/underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
    if (!usernameRegex.test(username)) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Username must be 4-20 characters, containing only letters, numbers, or underscores.'
      });
    }

    try {
      // Check username / email / phone uniqueness
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }]
        }
      });
      if (existingUser) {
        return reply.status(409).send({ error: 'Conflict', message: 'Email or phone number already registered.' });
      }

      const existingProfile = await prisma.profile.findUnique({
        where: { username }
      });
      if (existingProfile) {
        return reply.status(409).send({ error: 'Conflict', message: 'Username is already taken.' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create User and Profile in a transaction
      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            phone,
            passwordHash,
            dateOfBirth: dob,
            country
          }
        });

        await tx.profile.create({
          data: {
            userId: user.id,
            username,
            displayName,
            gender
          }
        });

        return user;
      });

      return reply.status(201).send({
        message: 'User registered successfully',
        userId: newUser.id
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, phone, password } = request.body;

    if (!password || (!email && !phone)) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Credentials (email or phone) and password required.' });
    }

    try {
      // Find user
      const user = await prisma.user.findFirst({
        where: email ? { email } : { phone },
        include: { profile: true }
      });

      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials.' });
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials.' });
      }

      // Generate JWT tokens
      const accessToken = fastify.jwt.sign(
        { userId: user.id, username: user.profile.username },
        { expiresIn: '15m' }
      );
      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      // Store device / session session
      const userAgent = request.headers['user-agent'] || 'unknown';
      const ipAddress = request.ip || '127.0.0.1';

      await prisma.device.create({
        data: {
          userId: user.id,
          refreshToken,
          userAgent,
          ipAddress
        }
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          username: user.profile.username,
          displayName: user.profile.displayName,
          role: user.role
        }
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
    }
  });

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Refresh token is required.' });
    }

    try {
      // Verify JWT token signature
      const decoded = fastify.jwt.verify(refreshToken);
      if (decoded.type !== 'refresh') {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token type.' });
      }

      // Check if refresh token is in db
      const device = await prisma.device.findUnique({
        where: { refreshToken },
        include: { user: { include: { profile: true } } }
      });

      if (!device) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Session expired or revoked.' });
      }

      // Generate new tokens
      const newAccessToken = fastify.jwt.sign(
        { userId: device.user.id, username: device.user.profile.username },
        { expiresIn: '15m' }
      );
      const newRefreshToken = fastify.jwt.sign(
        { userId: device.user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      // Rotate refresh token (revoke old, save new)
      await prisma.$transaction([
        prisma.device.delete({ where: { id: device.id } }),
        prisma.device.create({
          data: {
            userId: device.userId,
            refreshToken: newRefreshToken,
            userAgent: device.userAgent,
            ipAddress: device.ipAddress
          }
        })
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid refresh token.' });
    }
  });

  // POST /auth/logout (Revoke session)
  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body;
    if (refreshToken) {
      try {
        await prisma.device.delete({ where: { refreshToken } });
      } catch (err) {
        // Silently catch if already removed
      }
    }
    return { success: true, message: 'Logged out successfully.' };
  });
};
