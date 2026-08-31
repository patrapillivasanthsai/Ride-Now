const admin = require('firebase-admin');

let firebaseInitialized = false;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (projectId && clientEmail && privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
} else {
  console.warn('Firebase environment variables are missing. Push notifications will run in Mock Mode.');
}

/**
 * Sends a push notification to a registered device token.
 * Falls back to logging mock alerts in development/testing.
 */
export async function sendPushNotification(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: any
): Promise<boolean> {
  if (!token) {
    return false;
  }

  if (!firebaseInitialized) {
    console.log(`[Firebase Mock Notification] To: ${token} | Title: ${title} | Body: ${body}`);
    return true;
  }

  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data ? { payload: JSON.stringify(data) } : undefined
    });
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}
