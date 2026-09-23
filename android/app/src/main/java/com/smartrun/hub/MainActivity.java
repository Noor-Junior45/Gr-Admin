package com.smartrun.hub;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String HIGH_PRIORITY_CHANNEL_ID = "smartrun_order_alerts";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Configure WebView to allow immediate audio playback without requiring gesture
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                WebSettings settings = webView.getSettings();
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Create high priority notification channel for Android 8.0+ (Oreo and above)
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "SmartRun Order Alerts";
            String description = "High-priority audible alerts and popup notifications for incoming warehouse orders";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(HIGH_PRIORITY_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 700});
            channel.setShowBadge(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
