package com.ffsensitivity.app

import android.app.Application
import android.util.Log
import com.ffsensitivity.app.data.StylishNameCatalog
import com.ffsensitivity.app.util.AppLog

class FFSensitivityApp : Application() {
    override fun onCreate() {
        super.onCreate()
        runCatching { StylishNameCatalog.ensureLoaded(this) }
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            AppLog.e("Uncaught exception on ${thread.name}", error)
            runCatching { previous?.uncaughtException(thread, error) }
                .onFailure { Log.e("FFSensitivity", "Error forwarding uncaught exception", it) }
        }
    }
}
