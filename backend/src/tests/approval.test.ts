import request from 'supertest';
import app from '../app';
import { PrismaClient, UserRole } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

describe('Driver Approval Preflight & Execution Verification', () => {
  it('handles OPTIONS preflight for /api/admin/drivers/:id/approve with full CORS headers', async () => {
    const res = await request(app)
      .options('/api/admin/drivers/46721da7-ed41-4110-ba66-4f1bef243c15/approve')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect([200, 204]).toContain(res.status);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
  });

  it('allows approving a driver via POST /api/admin/drivers/:id/approve', async () => {
    let admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: `admin-approval-${Date.now()}@test.com`,
          password: 'hashedPassword',
          role: UserRole.ADMIN
        }
      });
    }
    const token = generateToken({ userId: admin.id, role: admin.role });

    const driverUser = await prisma.user.create({
      data: {
        email: `driver-to-approve-${Date.now()}@test.com`,
        password: 'hashedPassword',
        role: UserRole.DRIVER,
        driver: {
          create: {
            phone: `+91999${Date.now().toString().slice(-7)}`,
            isApproved: false,
            status: 'OFFLINE'
          }
        }
      },
      include: { driver: true }
    });

    const res = await request(app)
      .post(`/api/admin/drivers/${driverUser.driver!.id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'http://localhost:5174');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isApproved).toBe(true);

    // Clean up
    await prisma.driverNotification.deleteMany({ where: { driverId: driverUser.driver!.id } });
    await prisma.driver.delete({ where: { id: driverUser.driver!.id } });
    await prisma.user.delete({ where: { id: driverUser.id } });
  });
});
