import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

/**
 * GET /api/customer/notifications
 */
export async function getCustomerNotifications(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });

  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });

    const notifications = await prisma.notification.findMany({
      where: { customerId: customer.id },
      include: { offer: { select: { id: true, title: true, discountValue: true, couponCode: true, endDate: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({ where: { customerId: customer.id, isRead: false } });

    return res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

/**
 * PATCH /api/customer/notifications/:id/read
 */
export async function markCustomerNotificationRead(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({ where: { userId: req.user.id } });
    if (!customer) return res.status(404).json({ success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } });

    if (id === 'all') {
      await prisma.notification.updateMany({ where: { customerId: customer.id, isRead: false }, data: { isRead: true } });
    } else {
      await prisma.notification.update({ where: { id }, data: { isRead: true } });
    }

    return res.status(200).json({ success: true, data: { message: 'Marked as read' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

/**
 * GET /api/customer/offers
 */
export async function getActiveOffers(req: AuthenticatedRequest, res: Response) {
  try {
    const now = new Date();
    const offers = await prisma.offer.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: offers });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

/**
 * GET /api/driver/notifications
 */
export async function getDriverNotifications(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });

  try {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    const notifications = await prisma.driverNotification.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.driverNotification.count({ where: { driverId: driver.id, isRead: false } });

    return res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}

/**
 * PATCH /api/driver/notifications/:id/read
 */
export async function markDriverNotificationRead(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
  const { id } = req.params;

  try {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });

    if (id === 'all') {
      await prisma.driverNotification.updateMany({ where: { driverId: driver.id, isRead: false }, data: { isRead: true } });
    } else {
      await prisma.driverNotification.update({ where: { id }, data: { isRead: true } });
    }

    return res.status(200).json({ success: true, data: { message: 'Marked as read' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } });
  }
}
