package com.lumenx.app.transport;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(LocationSettingsPlugin.class);

        // Edge-to-edge: WebView receives safe-area-inset-* via viewport-fit=cover + CSS padding.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Allow content to render into the display cutout (notch / punch-hole) on notched
        // phones and foldables. Safe-area CSS padding keeps UI clear of the cutout itself.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }
}
