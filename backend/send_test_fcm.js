const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { PrismaClient } = require('@prisma/client');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  if (!match) return null;
  let val = match[1].trim();
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  return val.replace(/\\n/g, '\n');
}

const projectId = getEnvVar('FIREBASE_PROJECT_ID');
const clientEmail = getEnvVar('FIREBASE_CLIENT_EMAIL');
const privateKey = getEnvVar('FIREBASE_PRIVATE_KEY');

let token = process.argv[2];

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
}

async function sendTest() {
  const prisma = new PrismaClient();
  try {
    if (!token) {
      console.log('No token provided in arguments. Checking database for registered driver FCM token...');
      const driver = await prisma.user.findFirst({
        where: { role: 'DRIVER', fcmToken: { not: null } },
        orderBy: { updatedAt: 'desc' }
      });

      if (driver && driver.fcmToken) {
        token = driver.fcmToken;
        console.log(`Found registered driver in DB: ${driver.name} (${driver.phone})`);
      } else {
        console.log('ℹ️  No driver with registered FCM token found in DB yet.');
        console.log('👉 Please open Driver app on your phone, log in as driver, then re-run this script!');
        return;
      }
    }

    console.log(`🚀 Sending FCM Test notification to token: ${token.slice(0, 22)}...`);
    const response = await getMessaging().send({
      token,
      notification: {
        title: '🚖 New Ride Request Available!',
        body: 'Pickup: Mg Road Metro | Drop: Indiranagar 100ft Rd | Fare: ₹150'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'hmm_sound',
          channelId: 'ridenow_ride_alerts',
          defaultSound: false,
          defaultVibrateTimings: true,
          priority: 'max'
        }
      }
    });
    console.log('✅ FCM Test Notification Sent Successfully! Message ID:', response);
  } catch (err) {
    console.error('❌ Failed to send FCM Notification:', err);
  } finally {
    await prisma.$disconnect();
  }
}

sendTest();
