package com.lumenx.app.transport;

import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.os.Build;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationSettings")
public class LocationSettingsPlugin extends Plugin {
    private boolean isLocationEnabled() {
        LocationManager manager =
            (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return manager.isLocationEnabled();
        }

        return manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
    }

    private void resolveState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isLocationEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        resolveState(call);
    }

    @PluginMethod
    public void requestEnable(PluginCall call) {
        Intent intent = new Intent(getContext(), LocationResolutionActivity.class);
        startActivityForResult(call, intent, "locationSettingsResult");
    }

    @ActivityCallback
    private void locationSettingsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        resolveState(call);
    }
}
