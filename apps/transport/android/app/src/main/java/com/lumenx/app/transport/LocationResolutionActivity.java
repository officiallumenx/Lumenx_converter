package com.lumenx.app.transport;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;

/**
 * Transparent activity that displays Google's standard location-enable dialog
 * over the Transport app. The driver never has to navigate to Android Settings.
 */
public class LocationResolutionActivity extends Activity {
    private static final int REQUEST_ENABLE_LOCATION = 3201;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LocationRequest request = new LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            1_000L
        ).build();

        LocationSettingsRequest settingsRequest =
            new LocationSettingsRequest.Builder()
                .addLocationRequest(request)
                .setAlwaysShow(true)
                .build();

        LocationServices
            .getSettingsClient(this)
            .checkLocationSettings(settingsRequest)
            .addOnSuccessListener(response -> finishWithResult(true))
            .addOnFailureListener(error -> {
                if (error instanceof ResolvableApiException) {
                    try {
                        ((ResolvableApiException) error).startResolutionForResult(
                            this,
                            REQUEST_ENABLE_LOCATION
                        );
                        return;
                    } catch (Exception ignored) {
                        // Fall through and report that location remains disabled.
                    }
                }
                finishWithResult(false);
            });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_ENABLE_LOCATION) {
            finishWithResult(resultCode == RESULT_OK);
        }
    }

    private void finishWithResult(boolean enabled) {
        setResult(enabled ? RESULT_OK : RESULT_CANCELED);
        finish();
    }
}
