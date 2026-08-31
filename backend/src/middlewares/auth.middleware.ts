import { Response, NextFunction, Request } from 'express';
import { UserRole, PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/jwt';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Authentication middleware that extracts, decodes, and verifies a Bearer JWT token.
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is missing or invalid'
      }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    
    // Fetch user from DB to confirm they still exist and check current role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'The user session no longer exists'
        }
      });
    }

    // Check suspension status for drivers and customers
    if (user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findUnique({
        where: { userId: user.id },
        select: { isSuspended: true, suspendReason: true }
      });
      if (driver?.isSuspended) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: driver.suspendReason || 'Your account has been suspended. Contact support.',
            isSuspended: true
          }
        });
      }
    }

    if (user.role === UserRole.CUSTOMER) {
      const customer = await prisma.customer.findUnique({
        where: { userId: user.id },
        select: { isSuspended: true, suspendReason: true }
      });
      if (customer?.isSuspended) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: customer.suspendReason || 'Your account has been suspended. Contact support.',
            isSuspended: true
          }
        });
      }
    }

    // Attach user payload to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error: any) {
    const isExpired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired ? 'Access token has expired' : 'Access token is invalid'
      }
    });
  }
}

/**
 * Authorization middleware restricting route to specific user roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource'
        }
      });
    }

    next();
  };
}

/**
 * Middleware ensuring a user only accesses their own resources, or is an ADMIN.
 * Checks that the user ID parameter in the URL matches the logged-in user.
 * @param paramName Name of the parameter in the request params, e.g., 'id' or 'customerId'
 */
export function checkOwnership(paramName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const targetUserId = req.params[paramName];
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Resource ownership check failed'
        }
      });
    }

    next();
  };
}
