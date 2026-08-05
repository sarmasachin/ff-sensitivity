plugins {
    id("com.android.application") version "8.4.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    // --- Start: Push FCM live wire (Sachin) ---
    id("com.google.gms.google-services") version "4.4.2" apply false
    // --- End: Push FCM live wire (Sachin) ---
    // --- Start: App quality P3 Crashlytics (Sachin) ---
    id("com.google.firebase.crashlytics") version "3.0.7" apply false
    // --- End: App quality P3 Crashlytics (Sachin) ---
}
