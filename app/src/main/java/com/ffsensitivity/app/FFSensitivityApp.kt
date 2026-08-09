package com.ffsensitivity.app

import android.app.Application
import android.util.Log
import com.ffsensitivity.app.ads.CalculateRewardedAds
import com.ffsensitivity.app.data.StylishNameCatalog
import com.ffsensitivity.app.util.AppLog
import com.ffsensitivity.app.util.CrashReporting

class FFSensitivityApp : Application() {
    override fun onCreate() {
        super.onCreate()
        CrashReporting.initialize(this)
        CrashReporting.syncUser(this)
        CalculateRewardedAds.initialize(this)
        runCatching { StylishNameCatalog.ensureLoaded(this) }
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            AppLog.e("Uncaught exception on ${thread.name}", error)
            runCatching { previous?.uncaughtException(thread, error) }
                .onFailure { Log.e("FFSensitivity", "Error forwarding uncaught exception", it) }
        }
    }
}
