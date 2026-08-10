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
        versionCode = 4
        versionName = "1.0.3"

        val googleServerClientId = localProps.getProperty("GOOGLE_SERVER_CLIENT_ID", "")
        buildConfigField(
            "String",
            "GOOGLE_SERVER_CLIENT_ID",
            "\"$googleServerClientId\""
        )
        // Google sample IDs until real AdMob units are set in local.properties.
        val admobAppId = localProps.getProperty(
            "ADMOB_APP_ID",
            "ca-app-pub-3940256099942544~3347511713"
        )
        val rewardedCalculate = localProps.getProperty(
            "ADMOB_REWARDED_CALCULATE",
            "ca-app-pub-3940256099942544/5227853062"
        )
        val interstitialCheckIn = localProps.getProperty(
            "ADMOB_INTERSTITIAL_CHECKIN",
            "ca-app-pub-3940256099942544/1033173712"
        )
        val interstitialQuiz = localProps.getProperty(
            "ADMOB_INTERSTITIAL_QUIZ",
            "ca-app-pub-3940256099942544/1033173712"
        )
        val interstitialRedeemDaily = localProps.getProperty(
            "ADMOB_INTERSTITIAL_REDEEM_DAILY",
            "ca-app-pub-3940256099942544/1033173712"
        )
        buildConfigField("String", "ADMOB_REWARDED_CALCULATE", "\"$rewardedCalculate\"")
        buildConfigField("String", "ADMOB_INTERSTITIAL_CHECKIN", "\"$interstitialCheckIn\"")
        buildConfigField("String", "ADMOB_INTERSTITIAL_QUIZ", "\"$interstitialQuiz\"")
        buildConfigField(
            "String",
            "ADMOB_INTERSTITIAL_REDEEM_DAILY",
            "\"$interstitialRedeemDaily\""
        )
        manifestPlaceholders["admobAppId"] = admobAppId
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            // LAN / emulator HTTP OK for debug only.
            val debugApi =
                localProps.getProperty("API_BASE_URL", "http://10.0.2.2:4000")
            buildConfigField("String", "API_BASE_URL", "\"$debugApi\"")
            // Always Google sample units in debug — avoids NO_FILL from unused real units.
            val sampleApp = "ca-app-pub-3940256099942544~3347511713"
            val sampleRewarded = "ca-app-pub-3940256099942544/5227853062"
            val sampleInterstitial = "ca-app-pub-3940256099942544/1033173712"
            manifestPlaceholders["admobAppId"] = sampleApp
            buildConfigField("String", "ADMOB_REWARDED_CALCULATE", "\"$sampleRewarded\"")
            buildConfigField("String", "ADMOB_INTERSTITIAL_CHECKIN", "\"$sampleInterstitial\"")
            buildConfigField("String", "ADMOB_INTERSTITIAL_QUIZ", "\"$sampleInterstitial\"")
            buildConfigField(
                "String",
                "ADMOB_INTERSTITIAL_REDEEM_DAILY",
                "\"$sampleInterstitial\""
            )
        }
        release {
            // Full-size installable release (no R8 strip). Re-enable minify
            // before Play Store upload if you want a smaller AAB/APK.
            isMinifyEnabled = false
            isShrinkResources = false
            // Signed so the APK installs on device. Replace with a Play upload
            // keystore before Play Console / production distribution.
            signingConfig = signingConfigs.getByName("debug")
            // Release must be HTTPS (Play / production).
            val releaseApi = localProps.getProperty(
                "API_BASE_URL_RELEASE",
                "https://api.sensitivitysettings.com"
            )
            require(releaseApi.startsWith("https://")) {
                "API_BASE_URL_RELEASE must be https:// (got: $releaseApi)"
            }
            buildConfigField("String", "API_BASE_URL", "\"$releaseApi\"")
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
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

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

    // --- Start: AdMob Calculate rewarded (Sachin) ---
    implementation("com.google.android.gms:play-services-ads:23.6.0")
    // --- End: AdMob Calculate rewarded (Sachin) ---

    debugImplementation("androidx.compose.ui:ui-tooling")
}
