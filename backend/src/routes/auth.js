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

    // Validate compulsory fields
    if (!email || !username || !displayName || !password || !gender) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Full name, username, email, password, and gender are compulsory.'
      });
    }

    // Validate age if DOB is provided (must be 18+)
    let dob = null;
    if (dateOfBirth && dateOfBirth.toString().trim() !== '') {
      dob = new Date(dateOfBirth);
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
      const hasPhone = phone && phone.toString().trim() !== '';
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            ...(hasPhone ? [{ phone }] : [])
          ]
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
            phone: hasPhone ? phone : null,
            passwordHash,
            dateOfBirth: dob,
            country: (country && country.toString().trim() !== '') ? country : null
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

  // Helper to generate a unique username for Google OAuth registration
  async function generateUniqueUsername(prismaClient, email, name) {
    let base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (base.length < 4) {
      base = (base + 'user').substring(0, 10);
    }
    base = base.substring(0, 15).toLowerCase();

    let username = base;
    let isUnique = false;
    let counter = 0;

    while (!isUnique) {
      const existing = await prismaClient.profile.findUnique({
        where: { username }
      });
      if (!existing) {
        isUnique = true;
      } else {
        counter++;
        const suffix = counter.toString();
        username = base.substring(0, 20 - suffix.length) + suffix;
      }
    }
    return username;
  }

  // POST /auth/google (Google Sign-In / Auto-Registration)
  fastify.post('/google', async (request, reply) => {
    const { idToken } = request.body;
    if (!idToken) {
      return reply.status(400).send({ error: 'Validation Error', message: 'ID token is required.' });
    }

    try {
      let payload;
      if (idToken.startsWith('MOCK-ID-TOKEN-')) {
        const userType = idToken.split('-')[3]; // MOCK-ID-TOKEN-alice or MOCK-ID-TOKEN-bob
        if (userType === 'alice') {
          payload = {
            email: 'alice.google@funchat.com',
            name: 'Alice Google',
            picture: 'https://api.dicebear.com/7.x/adventurer/svg?seed=alice',
            aud: process.env.GOOGLE_CLIENT_ID || '200947288165-ta5kk1hagu0qtek0au0b6325qnt9lts8.apps.googleusercontent.com'
          };
        } else {
          payload = {
            email: 'bob.google@funchat.com',
            name: 'Bob Google',
            picture: 'https://api.dicebear.com/7.x/adventurer/svg?seed=bob',
            aud: process.env.GOOGLE_CLIENT_ID || '200947288165-ta5kk1hagu0qtek0au0b6325qnt9lts8.apps.googleusercontent.com'
          };
        }
      } else {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!googleRes.ok) {
          return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid Google token.' });
        }
        payload = await googleRes.json();
        const allowedClientId = process.env.GOOGLE_CLIENT_ID;
        if (allowedClientId && payload.aud !== allowedClientId) {
          return reply.status(401).send({ error: 'Unauthorized', message: 'Token audience mismatch.' });
        }
      }

      const { email, name, picture } = payload;
      if (!email) {
        return reply.status(400).send({ error: 'Validation Error', message: 'Email not provided by Google.' });
      }

      let user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true }
      });

      if (!user) {
        const username = await generateUniqueUsername(prisma, email, name);
        const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);

        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              passwordHash,
              country: 'System'
            }
          });

          const newProfile = await tx.profile.create({
            data: {
              userId: newUser.id,
              username,
              displayName: name || email.split('@')[0],
              avatarUrl: picture || null,
              gender: 'other',
              bio: 'Joined via Google'
            }
          });

          return { ...newUser, profile: newProfile };
        });
      }

      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role },
        { expiresIn: '1d' }
      );
      
      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      await prisma.device.create({
        data: {
          userId: user.id,
          refreshToken,
          userAgent: request.headers['user-agent'] || 'Unknown Device',
          ipAddress: request.ip
        }
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          displayName: user.profile.displayName,
          username: user.profile.username
        }
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
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
