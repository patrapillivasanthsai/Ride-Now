import { Response } from 'express';
import { PrismaClient, DocumentType, DocumentStatus, PayoutAccountType, WalletTransactionType, SupportCategory, SupportTicketStatus, VehicleType } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// In-memory OTP storage for development & testing (keyed by phone or email)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

/**
 * POST /api/auth/otp/send-mobile
 */
export async function sendMobileOtp(req: any, res: Response) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Phone number is required' }
    });
  }

  // Generate 6-digit random code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore[`mobile:${phone}`] = { code, expiresAt };

  console.log(`\n======================================================`);
  console.log(`📱 [MOBILE OTP SENT]`);
  console.log(`   Phone: ${phone}`);
  console.log(`   👉 6-DIGIT CODE: >>> ${code} <<<`);
  console.log(`======================================================\n`);

  return res.status(200).json({
    success: true,
    data: {
      message: 'Verification code sent successfully',
      phone,
      expiresIn: 300
    }
  });
}

/**
 * POST /api/auth/otp/verify-mobile
 */
export async function verifyMobileOtp(req: any, res: Response) {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Phone and OTP are required' }
    });
  }

  const stored = otpStore[`mobile:${phone}`];
  if (!stored) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_OTP', message: 'No active OTP found or expired. Please request a new code.' }
    });
  }

  if (Date.now() > stored.expiresAt) {
    delete otpStore[`mobile:${phone}`];
    return res.status(400).json({
      success: false,
      error: { code: 'EXPIRED_OTP', message: 'Verification code has expired. Please request a new code.' }
    });
  }

  if (stored.code !== String(otp).trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_OTP', message: 'Invalid verification code. Please check and try again.' }
    });
  }

  // Clear OTP on successful verification
  delete otpStore[`mobile:${phone}`];

  return res.status(200).json({
    success: true,
    data: {
      verified: true,
      phone,
      message: 'Mobile number verified successfully'
    }
  });
}

/**
 * POST /api/auth/forgot-password/send-otp
 */
export async function sendForgotPasswordOtp(req: any, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Registered email address is required' }
    });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'No account found with this email address.' }
    });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore[`email:${email.toLowerCase().trim()}`] = { code, expiresAt };

  console.log(`\n======================================================`);
  console.log(`🔑 [FORGOT PASSWORD EMAIL OTP]`);
  console.log(`   Email: ${email}`);
  console.log(`   👉 6-DIGIT CODE: >>> ${code} <<<`);
  console.log(`======================================================\n`);

  return res.status(200).json({
    success: true,
    data: {
      message: 'Password reset code sent to your email',
      email,
      expiresIn: 300
    }
  });
}

/**
 * POST /api/auth/forgot-password/verify-otp
 */
export async function verifyForgotPasswordOtp(req: any, res: Response) {
  const { email, otp } = req.body;
  const key = `email:${email?.toLowerCase().trim()}`;
  const stored = otpStore[key];

  if (!stored || Date.now() > stored.expiresAt || stored.code !== String(otp).trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_OTP', message: 'Invalid or expired email verification code.' }
    });
  }

  return res.status(200).json({
    success: true,
    data: { verified: true, message: 'Email code verified. You can now reset your password.' }
  });
}

/**
 * POST /api/auth/forgot-password/reset
 */
export async function resetForgotPassword(req: any, res: Response) {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email, OTP, and new password are required' }
    });
  }

  const key = `email:${email.toLowerCase().trim()}`;
  const stored = otpStore[key];
  if (!stored || stored.code !== String(otp).trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_OTP', message: 'Invalid or expired code. Please restart recovery flow.' }
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' }
    });
  }

  delete otpStore[key];

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { password: hashedPassword }
  });

  return res.status(200).json({
    success: true,
    data: { message: 'Password reset successfully! You can now log in.' }
  });
}

/**
 * GET /api/driver/documents
 */
export async function getDriverDocuments(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user!.id },
    include: { documents: true, vehicle: true }
  });

  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  return res.status(200).json({
    success: true,
    data: {
      documents: driver.documents,
      vehicleType: driver.vehicle?.type || 'BIKE'
    }
  });
}

/**
 * POST /api/driver/documents/upload
 */
export async function uploadDriverDocument(req: AuthenticatedRequest, res: Response) {
  const { type, frontUrl, backUrl } = req.body;
  if (!type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Document type is required' } });
  }

  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const doc = await prisma.driverDocument.upsert({
    where: {
      driverId_type: {
        driverId: driver.id,
        type: type as DocumentType
      }
    },
    update: {
      status: DocumentStatus.UNDER_REVIEW,
      frontUrl: frontUrl || 'https://via.placeholder.com/600x400.png?text=Document+Front',
      backUrl: backUrl || 'https://via.placeholder.com/600x400.png?text=Document+Back',
      rejectReason: null
    },
    create: {
      driverId: driver.id,
      type: type as DocumentType,
      status: DocumentStatus.UNDER_REVIEW,
      frontUrl: frontUrl || 'https://via.placeholder.com/600x400.png?text=Document+Front',
      backUrl: backUrl || 'https://via.placeholder.com/600x400.png?text=Document+Back'
    }
  });

  return res.status(200).json({ success: true, data: doc });
}

/**
 * GET /api/driver/payout-setup
 */
export async function getPayoutSetup(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user!.id },
    include: { payoutAccounts: true }
  });

  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  return res.status(200).json({
    success: true,
    data: {
      payoutAccounts: driver.payoutAccounts
    }
  });
}

/**
 * POST /api/driver/payout-setup
 */
export async function savePayoutSetup(req: AuthenticatedRequest, res: Response) {
  const { type, accountHolderName, bankName, accountNumber, ifscCode, upiId } = req.body;

  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  let maskedNumber: string | undefined = undefined;
  if (accountNumber) {
    const raw = String(accountNumber).trim();
    maskedNumber = raw.length > 4 ? `•••• ${raw.slice(-4)}` : raw;
  }

  // Remove previous payout setups for clean update
  await prisma.driverPayoutAccount.deleteMany({
    where: { driverId: driver.id }
  }).catch(() => {});

  const payout = await prisma.driverPayoutAccount.create({
    data: {
      driverId: driver.id,
      type: type === 'UPI' ? PayoutAccountType.UPI : PayoutAccountType.BANK_ACCOUNT,
      accountHolderName: accountHolderName || null,
      bankName: bankName || 'Bank Account',
      accountNumberMasked: maskedNumber || null,
      ifscCode: ifscCode || null,
      upiId: upiId || null,
      isDefault: true,
      isVerified: true
    }
  });

  return res.status(200).json({ success: true, data: payout });
}

/**
 * GET /api/driver/training
 */
export async function getSafetyTraining(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const modules = [
    { id: 1, title: 'Safe Driving Practices', duration: '4 mins', completed: true },
    { id: 2, title: 'Customer Etiquette & Guidelines', duration: '3 mins', completed: true },
    { id: 3, title: 'Ride Cancellation & Acceptance Policy', duration: '3 mins', completed: true },
    { id: 4, title: 'Emergency, Safety & SOS Features', duration: '5 mins', completed: driver.trainingCompleted }
  ];

  return res.status(200).json({
    success: true,
    data: {
      completedCount: driver.trainingCompleted ? 4 : 3,
      totalCount: 4,
      isFullyCompleted: driver.trainingCompleted,
      modules
    }
  });
}

/**
 * POST /api/driver/training/complete
 */
export async function completeSafetyTraining(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { trainingCompleted: true }
  });

  return res.status(200).json({
    success: true,
    data: { isFullyCompleted: true, message: 'Captain safety training completed successfully!' }
  });
}

/**
 * GET /api/driver/wallet
 */
export async function getDriverWallet(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user!.id },
    include: {
      payoutAccounts: { where: { isDefault: true } },
      walletTransactions: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });

  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const availableBalance = parseFloat((driver.walletBalance || 0).toFixed(2));

  return res.status(200).json({
    success: true,
    data: {
      availableBalance,
      linkedAccount: driver.payoutAccounts[0] || null,
      transactions: driver.walletTransactions
    }
  });
}

/**
 * POST /api/driver/wallet/withdraw
 */
export async function requestWalletWithdrawal(req: AuthenticatedRequest, res: Response) {
  const { amount } = req.body;
  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Enter a valid withdrawal amount.' } });
  }

  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const currentBalance = driver.walletBalance || 0;
  if (withdrawAmount > currentBalance) {
    return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_FUNDS', message: 'Withdrawal amount exceeds available wallet balance.' } });
  }

  const tx = await prisma.driverWalletTransaction.create({
    data: {
      driverId: driver.id,
      amount: -withdrawAmount,
      type: WalletTransactionType.WITHDRAWAL,
      description: `Bank Withdrawal payout`
    }
  });

  const updatedBalance = parseFloat((currentBalance - withdrawAmount).toFixed(2));
  await prisma.driver.update({
    where: { id: driver.id },
    data: { walletBalance: updatedBalance }
  });

  return res.status(200).json({
    success: true,
    data: {
      withdrawnAmount: withdrawAmount,
      remainingBalance: updatedBalance,
      message: `₹${withdrawAmount.toFixed(2)} payout initiated to your linked bank account.`
    }
  });
}

/**
 * GET /api/driver/referrals
 */
export async function getDriverReferrals(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const code = driver.referralCode || 'RIDENOW25';

  return res.status(200).json({
    success: true,
    data: {
      referralCode: code,
      shareUrl: `https://ridenow.app/join?ref=${code}`,
      invitedCount: 8,
      joinedCount: 4,
      qualifiedCount: 2,
      totalEarned: 3000,
      rewardPerReferral: 1500
    }
  });
}

/**
 * GET /api/driver/support/tickets
 */
export async function getSupportTickets(req: AuthenticatedRequest, res: Response) {
  const driver = await prisma.driver.findUnique({
    where: { userId: req.user!.id },
    include: { supportTickets: { orderBy: { createdAt: 'desc' } } }
  });

  return res.status(200).json({
    success: true,
    data: {
      tickets: driver?.supportTickets || []
    }
  });
}

/**
 * POST /api/driver/support/tickets
 */
export async function createSupportTicket(req: AuthenticatedRequest, res: Response) {
  const { category, subject, message, isEmergency } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Subject and message are required' } });
  }

  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user!.id,
      driverId: driver?.id,
      category: category || SupportCategory.RIDE_ISSUES,
      subject,
      message,
      isEmergency: !!isEmergency
    }
  });

  return res.status(200).json({
    success: true,
    data: { ticket, message: isEmergency ? '🚨 SOS Alert Received. Priority response team alerted.' : 'Support ticket submitted successfully.' }
  });
}

/**
 * PUT /api/driver/preferred-area
 */
export async function setPreferredArea(req: AuthenticatedRequest, res: Response) {
  const { area } = req.body;
  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.status(404).json({ success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found' } });
  }

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { preferredArea: area || null }
  });

  return res.status(200).json({
    success: true,
    data: { preferredArea: updated.preferredArea }
  });
}
