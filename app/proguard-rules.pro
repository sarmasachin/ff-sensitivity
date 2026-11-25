# FF Sensitivity — release R8 (Play obfuscation 25%+)
# Prefer library consumer rules; avoid blanket -keep on whole SDKs.

-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile
-allowaccessmodification
-repackageclasses 'o'

# BuildConfig fields used at runtime
-keepclassmembers class com.ffsensitivity.app.BuildConfig {
    public static <fields>;
}

# OkHttp / Okio — consumer rules ship with the AAR; dontwarn only
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.codehaus.mojo.animal_sniffer.**
-dontwarn javax.annotation.**

# Kotlin / coroutines
-dontwarn kotlin.**
-keep class kotlin.Metadata { *; }
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }

# EncryptedSharedPreferences / Tink
-keep class androidx.security.crypto.** { *; }
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**

# Credentials / Google Sign-In (reflection)
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-keep class com.google.android.gms.auth.** { *; }

# AdMob — keep ads API surface; do not blanket-keep all of play-services
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.**

# Firebase — Crashlytics / Messaging plugins add consumer rules
-dontwarn com.google.firebase.**

# Crashlytics readable stacks
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
