import express, { Application, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const app: Application = express();
const prisma = new PrismaClient();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Minimal health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "RideNow backend is running"
  });
});

// Endpoint to create a new user (for testing Prisma)
app.post('/users', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password || 'defaultPass123', salt);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'CUSTOMER',
      },
    });
    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create user",
    });
  }
});

// Endpoint to get all users
app.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
});

export default app;
export { prisma };
