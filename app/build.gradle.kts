import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    // --- Start: Push FCM live wire (Sachin) ---
    id("com.google.gms.google-services")
    // --- End: Push FCM live wire (Sachin) ---
    // --- Start: App quality P3 Crashlytics (Sachin) ---
    id("com.google.firebase.crashlytics")
    // --- End: App quality P3 Crashlytics (Sachin) ---
}

val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.ffsensitivity.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ffsensitivity.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        val googleServerClientId = localProps.getProperty("GOOGLE_SERVER_CLIENT_ID", "")
        buildConfigField(
            "String",
            "GOOGLE_SERVER_CLIENT_ID",
            "\"$googleServerClientId\""
        )
        // --- Start: Redeem live wire (Sachin) ---
        val apiBaseUrl = localProps.getProperty("API_BASE_URL", "http://10.0.2.2:4000")
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"$apiBaseUrl\""
        )
        // --- End: Redeem live wire (Sachin) ---
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.2")
    implementation("androidx.navigation:navigation-compose:2.8.3")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // --- Start: Redeem live wire (Sachin) ---
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    // --- End: Redeem live wire (Sachin) ---

    // --- Start: Push FCM live wire (Sachin) ---
    implementation(platform("com.google.firebase:firebase-bom:34.17.0"))
    implementation("com.google.firebase:firebase-messaging")
    // --- End: Push FCM live wire (Sachin) ---
    // --- Start: App quality P3 Crashlytics (Sachin) ---
    implementation("com.google.firebase:firebase-crashlytics")
    // --- End: App quality P3 Crashlytics (Sachin) ---

    debugImplementation("androidx.compose.ui:ui-tooling")
}
