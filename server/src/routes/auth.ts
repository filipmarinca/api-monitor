import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const apiKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        apiKey,
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        apiKey: true,
        createdAt: true,
      },
    });

    // Create default workspace
    await prisma.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug: `${email.split('@')[0]}-${Date.now()}`,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 */
router.get('/me', authenticate, async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        apiKey: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
