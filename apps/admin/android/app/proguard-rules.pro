# LumenX Admin — R8 / ProGuard (release minify)
# Play Console: DEX optimization + obfuscation scores require minifyEnabled +
# proguard-android-optimize.txt (not the legacy -dontoptimize file).

# Keep line numbers for crash / ANR stacks; hide original source path.
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# Capacitor annotations are read via Class.getAnnotation() / Method.getAnnotation().
# Without these, R8 full mode can null PluginHandle.pluginAnnotation (ionic-team/capacitor#8589).
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }

-keepclassmembers class com.getcapacitor.PluginHandle {
    java.lang.Class pluginClass;
    com.getcapacitor.annotation.CapacitorPlugin pluginAnnotation;
    com.getcapacitor.NativePlugin legacyPluginAnnotation;
    com.getcapacitor.annotation.CapacitorPlugin getPluginAnnotation();
    com.getcapacitor.NativePlugin getLegacyPluginAnnotation();
    <init>(...);
}

# App + any custom native plugins under the Admin package
-keep class com.lumenx.app.admin.** { *; }

# Cordova bridge (Capacitor may still load Cordova-style plugins)
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }

# Optional runtime probes some Capacitor plugins use — do not fail the build
-dontwarn io.requery.android.database.**
-dontwarn net.zetetic.database.**
