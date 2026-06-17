// Sends push notifications via Expo's free push notification service
// (no Firebase native SDK required)

async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
  } catch (err) {
    console.log('Push notification failed:', err.message);
  }
}

module.exports = { sendPushNotification };
