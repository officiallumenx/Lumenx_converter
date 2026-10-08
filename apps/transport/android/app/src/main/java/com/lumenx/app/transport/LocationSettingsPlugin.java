package com.lumenx.app.transport;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.location.CurrentLocationRequest;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

/**
 * Location helpers that bypass Capacitor Geolocation's brittle "services enabled"
 * gate (which often reports GPS off while Android LocationManager says on).
 */
@CapacitorPlugin(name = "LocationSettings")
public class LocationSettingsPlugin extends Plugin {
    private static final long POSITION_TIMEOUT_MS = 12_000L;

    /**
     * True when Android location is on. Prefer LocationManager.isLocationEnabled,
     * then providers, then Secure settings — never report off when any signal says on.
     */
    private boolean isLocationEnabled() {
        LocationManager manager =
            (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);

        if (manager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && manager.isLocationEnabled()) {
                    return true;
                }
            } catch (Exception ignored) {
                // Fall through.
            }

            try {
                if (
                    manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                        || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                        || manager.isProviderEnabled(LocationManager.PASSIVE_PROVIDER)
                ) {
                    return true;
                }
            } catch (Exception ignored) {
                // Fall through.
            }
        }

        try {
            // LOCATION_PROVIDERS_ALLOWED is legacy but still populated on many OEMs.
            String allowed = Settings.Secure.getString(
                getContext().getContentResolver(),
                Settings.Secure.LOCATION_PROVIDERS_ALLOWED
            );
            if (allowed != null && allowed.length() > 0) {
                return true;
            }
        } catch (Exception ignored) {
            // Fall through.
        }

        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                int mode = Settings.Secure.getInt(
                    getContext().getContentResolver(),
                    Settings.Secure.LOCATION_MODE,
                    Settings.Secure.LOCATION_MODE_OFF
                );
                if (mode != Settings.Secure.LOCATION_MODE_OFF) {
                    return true;
                }
            }
        } catch (Exception ignored) {
            // Fall through.
        }

        return false;
    }

    private boolean hasFinePermission() {
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasCoarsePermission() {
        return ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasAnyLocationPermission() {
        return hasFinePermission() || hasCoarsePermission();
    }

    private void resolveEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isLocationEnabled());
        call.resolve(result);
    }

    private Location readLastKnown() {
        if (!hasAnyLocationPermission()) return null;
        LocationManager manager =
            (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return null;

        Location best = null;
        String[] providers = new String[] {
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER,
        };
        for (String provider : providers) {
            try {
                Location candidate = manager.getLastKnownLocation(provider);
                if (candidate == null) continue;
                if (best == null || candidate.getTime() > best.getTime()) {
                    best = candidate;
                }
            } catch (SecurityException | IllegalArgumentException ignored) {
                // Provider missing or permission race.
            }
        }
        return best;
    }

    private void resolvePosition(PluginCall call, Location location) {
        JSObject result = new JSObject();
        result.put("latitude", location.getLatitude());
        result.put("longitude", location.getLongitude());
        if (location.hasAccuracy()) {
            result.put("accuracy", location.getAccuracy());
        }
        result.put("timestamp", location.getTime());
        call.resolve(result);
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        resolveEnabled(call);
    }

    /**
     * App location permission via PackageManager — does not call Capacitor Geolocation.
     */
    @PluginMethod
    public void hasPermission(PluginCall call) {
        boolean fine = hasFinePermission();
        boolean coarse = hasCoarsePermission();
        JSObject result = new JSObject();
        result.put("granted", fine || coarse);
        result.put("fine", fine);
        result.put("coarse", coarse);
        call.resolve(result);
    }

    /**
     * Current/last position via Fused + LocationManager — bypasses Cap Geolocation.
     * Options: enableHighAccuracy (bool), timeout (number ms), maximumAge (number ms).
     */
    @PluginMethod
    public void getCurrentPosition(PluginCall call) {
        if (!hasAnyLocationPermission()) {
            call.reject("Location permission denied", "PERMISSION_DENIED");
            return;
        }

        boolean highAccuracy = Boolean.TRUE.equals(call.getBoolean("enableHighAccuracy", false));
        long timeoutMs = call.getLong("timeout", POSITION_TIMEOUT_MS);
        long maximumAge = call.getLong("maximumAge", 120_000L);

        Location last = readLastKnown();
        if (last != null) {
            long age = System.currentTimeMillis() - last.getTime();
            if (age >= 0 && age <= maximumAge) {
                resolvePosition(call, last);
                return;
            }
        }

        final boolean[] settled = { false };
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable timeout = () -> {
            if (settled[0]) return;
            Location fallback = readLastKnown();
            if (fallback != null) {
                settled[0] = true;
                resolvePosition(call, fallback);
                return;
            }
            if (settled[0]) return;
            settled[0] = true;
            if (isLocationEnabled()) {
                // Services on but no fix yet — soft failure for JS to treat as "on".
                call.reject("Could not obtain location", "POSITION_UNAVAILABLE");
            } else {
                call.reject("Location services are not enabled", "SERVICES_DISABLED");
            }
        };
        handler.postDelayed(timeout, Math.max(2_000L, timeoutMs));

        try {
            FusedLocationProviderClient client =
                LocationServices.getFusedLocationProviderClient(getContext());
            int priority = highAccuracy
                ? Priority.PRIORITY_HIGH_ACCURACY
                : Priority.PRIORITY_BALANCED_POWER_ACCURACY;

            CurrentLocationRequest request = new CurrentLocationRequest.Builder()
                .setPriority(priority)
                .setDurationMillis(Math.max(2_000L, timeoutMs))
                .setMaxUpdateAgeMillis(Math.max(0L, maximumAge))
                .build();

            client
                .getCurrentLocation(request, null)
                .addOnSuccessListener(location -> {
                    if (settled[0]) return;
                    if (location != null) {
                        settled[0] = true;
                        handler.removeCallbacks(timeout);
                        resolvePosition(call, location);
                        return;
                    }
                    Location fallback = readLastKnown();
                    if (fallback != null) {
                        settled[0] = true;
                        handler.removeCallbacks(timeout);
                        resolvePosition(call, fallback);
                    }
                })
                .addOnFailureListener(error -> {
                    if (settled[0]) return;
                    Location fallback = readLastKnown();
                    if (fallback != null) {
                        settled[0] = true;
                        handler.removeCallbacks(timeout);
                        resolvePosition(call, fallback);
                        return;
                    }
                    // Leave timeout handler to settle — fused often fails when Cap would too.
                });
        } catch (SecurityException e) {
            if (settled[0]) return;
            settled[0] = true;
            handler.removeCallbacks(timeout);
            call.reject("Location permission denied", "PERMISSION_DENIED");
        } catch (Exception e) {
            if (settled[0]) return;
            Location fallback = readLastKnown();
            if (fallback != null) {
                settled[0] = true;
                handler.removeCallbacks(timeout);
                resolvePosition(call, fallback);
                return;
            }
            settled[0] = true;
            handler.removeCallbacks(timeout);
            call.reject(
                e.getMessage() != null ? e.getMessage() : "Location failed",
                "POSITION_UNAVAILABLE"
            );
        }
    }

    @PluginMethod
    public void requestEnable(PluginCall call) {
        Intent intent = new Intent(getContext(), LocationResolutionActivity.class);
        startActivityForResult(call, intent, "locationSettingsResult");
    }

    /** Start location foreground service so trip GPS can continue when screen is locked. */
    @PluginMethod
    public void startTripTracking(PluginCall call) {
        try {
            TripTrackingService.start(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject(
                e.getMessage() != null ? e.getMessage() : "Unable to start trip tracking",
                "TRIP_TRACKING_START_FAILED"
            );
        }
    }

    @PluginMethod
    public void stopTripTracking(PluginCall call) {
        try {
            TripTrackingService.stop(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject(
                e.getMessage() != null ? e.getMessage() : "Unable to stop trip tracking",
                "TRIP_TRACKING_STOP_FAILED"
            );
        }
    }

    @ActivityCallback
    private void locationSettingsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        // Play Services just confirmed settings — trust RESULT_OK even if
        // LocationManager briefly lags after the dialog closes.
        if (result.getResultCode() == Activity.RESULT_OK) {
            JSObject enabled = new JSObject();
            enabled.put("enabled", true);
            call.resolve(enabled);
            return;
        }
        resolveEnabled(call);
    }
}
