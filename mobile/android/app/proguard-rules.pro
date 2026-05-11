# ─── React Native core ─────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ─── Expo modules ──────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-keep class com.expo.** { *; }

# ─── Reanimated ────────────────────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }

# ─── React Native bridge annotations (accessed via reflection) ─────────────────
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keepclassmembers,allowobfuscation class * {
    @com.facebook.react.bridge.ReactProp *;
    @com.facebook.react.bridge.ReactPropGroup *;
}

# ─── Native (JNI) methods ──────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ─── Kotlin stdlib ─────────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlin.reflect.jvm.internal.**
-keepclassmembernames class kotlinx.** { volatile <fields>; }

# ─── Serializable ──────────────────────────────────────────────────────────────
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !private <methods>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ─── WebView (LeafletMapView uses a WebView) ───────────────────────────────────
-keep class * extends android.webkit.WebViewClient { *; }
-keep class * extends android.webkit.WebChromeClient { *; }

# ─── OkHttp / Okio (used internally by React Native networking) ────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# ─── Miscellaneous suppression ─────────────────────────────────────────────────
-dontwarn java.nio.file.*
-dontwarn org.codehaus.mojo.animal_sniffer.*
-dontwarn com.google.errorprone.annotations.*

# ─── Strip all Log calls in release — no debug info leaks into the APK ─────────
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
}
