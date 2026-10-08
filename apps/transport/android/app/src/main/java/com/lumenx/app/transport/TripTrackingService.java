package com.lumenx.app.transport;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service that keeps the Transport WebView process eligible for
 * continued GPS capture while a trip is active (screen locked / app backgrounded).
 * Does not replace JS GPS capture — only holds a location foreground notification.
 */
public class TripTrackingService extends Service {
    public static final String ACTION_START = "com.lumenx.app.transport.TRIP_TRACKING_START";
    public static final String ACTION_STOP = "com.lumenx.app.transport.TRIP_TRACKING_STOP";
    private static final String CHANNEL_ID = "lumenx_trip_tracking";
    private static final int NOTIFICATION_ID = 7101;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        ensureChannel();
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Trip location tracking",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps bus GPS active during a trip");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = null;
        if (launch != null) {
            contentIntent = PendingIntent.getActivity(
                this,
                0,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Trip in progress")
            .setContentText("Sharing live bus location with parents")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    public static void start(Context context) {
        Intent intent = new Intent(context, TripTrackingService.class);
        intent.setAction(ACTION_START);
        ContextCompatStart.startForeground(context, intent);
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, TripTrackingService.class);
        intent.setAction(ACTION_STOP);
        context.startService(intent);
    }

    /** API 26+ startForegroundService helper without pulling extra deps into call sites. */
    private static final class ContextCompatStart {
        static void startForeground(Context context, Intent intent) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        }
    }
}
