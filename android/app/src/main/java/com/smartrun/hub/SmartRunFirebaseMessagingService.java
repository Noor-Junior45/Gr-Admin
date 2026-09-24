package com.smartrun.hub;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Handles incoming Firebase Cloud Messaging push notifications even when the app is completely CLOSED or in background.
 * Overwrites standard phone notification sounds with our custom warehouse loud ringing bell: res/raw/smartrun_order_alert.wav
 */
public class SmartRunFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "SmartRunFCM";
    public static final String CHANNEL_ID = "smartrun_order_alerts";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM Device Registration Token: " + token);
        // Token is stored on client side and synced with Supabase device_tokens
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM message received from: " + remoteMessage.getFrom());

        Map<String, String> data = remoteMessage.getData();
        String title = "⚡ New Order Received!";
        String body = "An incoming order is waiting for fulfillment. Tap to open and pack.";
        String orderId = null;

        // Check if message has data payload
        if (data != null && !data.isEmpty()) {
            if (data.containsKey("title")) title = data.get("title");
            if (data.containsKey("body")) body = data.get("body");
            if (data.containsKey("order_id")) orderId = data.get("order_id");
            if (data.containsKey("orderId")) orderId = data.get("orderId");
        }

        // Check if message has notification payload
        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null) {
                title = remoteMessage.getNotification().getTitle();
            }
            if (remoteMessage.getNotification().getBody() != null) {
                body = remoteMessage.getNotification().getBody();
            }
        }

        showIncomingOrderNotification(title, body, orderId);
    }

    private void showIncomingOrderNotification(String title, String body, String orderId) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        // Custom Sound URI pointing to app's own sound file in res/raw/smartrun_order_alert
        Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/" + R.raw.smartrun_order_alert);

        // Ensure high priority notification channel with our custom sound override exists
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SmartRun Order Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("High-priority loud audible alerts and popup notifications for incoming warehouse orders");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 600, 250, 600, 250, 800});
            channel.setSound(soundUri, audioAttributes);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true); // Bypass Do Not Disturb for urgent orders

            notificationManager.createNotificationChannel(channel);
        }

        // Intent to launch app directly when notification is clicked
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (orderId != null) {
            intent.putExtra("orderId", orderId);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setSound(soundUri)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(pendingIntent)
                .setVibrate(new long[]{0, 600, 250, 600, 250, 800});

        int notificationId = (int) (System.currentTimeMillis() % 100000);
        notificationManager.notify(notificationId, notificationBuilder.build());
    }
}
