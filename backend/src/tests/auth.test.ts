import request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import app from '../app';
import { generateToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Authentication and Authorization API Integration Tests', () => {
  const customerEmail = `test-customer-${Date.now()}@example.com`;
  const driverEmail = `test-driver-${Date.now()}@example.com`;
  const password = 'testPassword123';

  let customerToken: string;
  let customerId: string;
  let driverToken: string;
  let driverId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    // Clean only test accounts to prevent foreign key errors and preserve seeded data
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'test-',
        },
      },
      select: {
        id: true,
        customer: { select: { id: true } },
        driver: { select: { id: true } }
      }
    });

    const testUserIds = testUsers.map(u => u.id);
    const testCustomerIds = testUsers.map(u => u.customer?.id).filter((id): id is string => !!id);
    const testDriverIds = testUsers.map(u => u.driver?.id).filter((id): id is string => !!id);

    await prisma.driverLocation.deleteMany({
      where: { driverId: { in: testDriverIds } }
    });
    await prisma.vehicle.deleteMany({
      where: { driverId: { in: testDriverIds } }
    });
    await prisma.driver.deleteMany({
      where: { id: { in: testDriverIds } }
    });
    await prisma.customer.deleteMany({
      where: { id: { in: testCustomerIds } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } }
    });

    // Create a seed Admin user for testing admin role features
    const adminUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });
    if (adminUser) {
      adminId = adminUser.id;
      adminToken = generateToken({ userId: adminUser.id, role: adminUser.role });
    } else {
      // Fallback: create a test admin user
      const newAdmin = await prisma.user.create({
        data: {
          email: 'test-admin@ridenow.com',
          password: 'hashedPasswordPlaceholder',
          role: UserRole.ADMIN,
        },
      });
      adminId = newAdmin.id;
      adminToken = generateToken({ userId: newAdmin.id, role: newAdmin.role });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register/customer', () => {
    it('1. Customer registration succeeds with valid input', async () => {
      const res = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: customerEmail,
          password,
          phone: '+15551112222',
          name: 'Test Customer',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe(customerEmail);
      expect(res.body.data.role).toBe('CUSTOMER');
      expect(res.body.data.customerProfile).toHaveProperty('id');
      expect(res.body.data).not.toHaveProperty('password');

      customerId = res.body.data.id;
    });

    it('2. Duplicate email registration fails', async () => {
      const res = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: customerEmail,
          password,
          phone: '+15551112222',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('3. Invalid registration input fails (e.g. short password, bad email)', async () => {
      const res = await request(app)
        .post('/api/auth/register/customer')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('4. Password is stored hashed in the database', async () => {
      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
      });
      expect(user).toBeDefined();
      expect(user?.password).not.toBe(password);
      expect(user?.password.startsWith('$2a$')).toBe(true); // Blowfish standard hashed password
    });
  });

  describe('POST /api/auth/register/driver', () => {
    it('Driver registration succeeds and configures vehicle', async () => {
      const res = await request(app)
        .post('/api/auth/register/driver')
        .send({
          email: driverEmail,
          password,
          phone: '+15553334444',
          vehicle: {
            make: 'Honda',
            model: 'Civic',
            year: 2021,
            color: 'Blue',
            plateNumber: `TST-${Date.now()}`,
            type: 'CAB',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('DRIVER');
      expect(res.body.data.driverProfile.vehicle.make).toBe('Honda');
      expect(res.body.data.driverProfile.isApproved).toBe(false); // New drivers start unapproved

      driverId = res.body.data.id;
    });
  });

  describe('POST /api/auth/login', () => {
    it('5. Login with correct credentials succeeds and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: customerEmail,
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(customerEmail);

      customerToken = res.body.data.token;
    });

    it('6. Login with incorrect credentials fails with generic message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: customerEmail,
          password: 'wrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Authorization Middlewares Verification', () => {
    it('7. Missing JWT is rejected with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('8. Invalid JWT is rejected with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('9. Expired JWT is rejected with 401', async () => {
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
      // Sign an already expired token manually
      const expiredToken = jwt.sign(
        { userId: customerId, role: 'CUSTOMER' },
        secret,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('10. Authenticated /me profile returns expected details', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(customerEmail);
      expect(res.body.data.role).toBe('CUSTOMER');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('11. Customer cannot access admin-only endpoint', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('12. Driver cannot access admin-only endpoint', async () => {
      // Driver login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: driverEmail,
          password,
        });
      driverToken = loginRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('13. Admin can access admin-protected endpoint', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Welcome Admin');
    });

    it('14. User cannot access another user\'s protected resource', async () => {
      // Customer trying to access driver's resource (e.g. checkOwnership check)
      const res = await request(app)
        .get(`/api/auth/users/${driverId}/private`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('User can access their own protected resource', async () => {
      const res = await request(app)
        .get(`/api/auth/users/${customerId}/private`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Owner verified');
    });
  });
});
