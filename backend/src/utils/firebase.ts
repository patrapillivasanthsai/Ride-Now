import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let firebaseInitialized = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (projectId && clientEmail && privateKey) {
  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    }
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully for project:', projectId);
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
} else {
  console.warn('Firebase environment variables are missing. Push notifications running in Mock Mode.');
}

/**
 * Sends a push notification to a registered device token.
 */
export async function sendPushNotification(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  if (!token) {
    console.log('[Firebase Push Notice] No device token registered for driver');
    return false;
  }

  if (!firebaseInitialized) {
    console.log(`[Firebase Mock Notification] To: ${token} | Title: ${title} | Body: ${body}`);
    return true;
  }

  try {
    const response = await getMessaging().send({
      token,
      notification: { title, body },
      data: data ? { payload: JSON.stringify(data) } : undefined,
      android: {
        priority: 'high',
        notification: {
          sound: 'hmm_sound',
          channelId: 'ridenow_ride_alerts',
          defaultSound: false,
          defaultVibrateTimings: true,
          priority: 'max'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'hmm_sound.mp3',
            badge: 1
          }
        }
      }
    });
    console.log(`[Firebase FCM Success] Sent notification to ${token.slice(0, 18)}... | Message ID: ${response}`);
    return true;
  } catch (error: any) {
    console.error(`[Firebase FCM Error] Failed to deliver to ${token.slice(0, 18)}... | Code: ${error.code} | Message: ${error.message}`);
    return false;
  }
}
