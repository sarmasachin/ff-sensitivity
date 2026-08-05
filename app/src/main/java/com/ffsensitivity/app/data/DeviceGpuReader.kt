package com.ffsensitivity.app.data

import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.GLES20

object DeviceGpuReader {

    data class GpuInfo(
        val renderer: String,
        val vendor: String,
        val label: String,
        val glesVersion: String
    )

    private data class GpuGlStrings(
        val renderer: String,
        val vendor: String,
        val version: String
    )

    fun read(): GpuInfo {
        // Only trust driver strings from a live EGL/GLES context.
        // Never fall back to SoC / Build.HARDWARE — those are not GPU model names.
        val gl = readGpuViaEgl()
        if (gl != null && gl.renderer.isNotBlank()) {
            return GpuInfo(
                renderer = gl.renderer,
                vendor = gl.vendor.ifBlank { "Unknown" },
                label = cleanGpuLabel(gl.renderer),
                glesVersion = formatGlesVersionLabel(gl.version)
            )
        }

        return GpuInfo(
            renderer = "Unknown GPU",
            vendor = "Unknown",
            label = "Unknown GPU",
            glesVersion = "Unknown"
        )
    }

    private fun cleanGpuLabel(raw: String): String {
        return raw
            .replace("(TM)", "", ignoreCase = true)
            .replace("(R)", "", ignoreCase = true)
            .replace(Regex("\\s+"), " ")
            .trim()
            .ifBlank { "Unknown GPU" }
    }

    private fun formatGlesVersionLabel(rawVersion: String): String {
        val v = rawVersion.trim()
        if (v.isBlank()) return "Unknown"
        // Driver strings look like: "OpenGL ES 3.2 V@0625.0 (...)"
        val marker = "OpenGL ES"
        val idx = v.indexOf(marker, ignoreCase = true)
        if (idx >= 0) {
            val after = v.substring(idx + marker.length).trimStart()
            val number = after.takeWhile { it.isDigit() || it == '.' }
            if (number.isNotBlank()) return "OpenGL ES $number"
        }
        return if (v.length <= 48) v else v.take(48)
    }

    /**
     * Offscreen EGL pbuffer — only accurate public source for GPU renderer/vendor.
     * Tries ES3 context first, then ES2. No SoC/hardware fallbacks.
     */
    private fun readGpuViaEgl(): GpuGlStrings? {
        // Prefer ES3 so GL_VERSION reflects true device capability when available.
        return readGpuViaEglWithClientVersion(3) ?: readGpuViaEglWithClientVersion(2)
    }

    private fun readGpuViaEglWithClientVersion(clientVersion: Int): GpuGlStrings? {
        var display = EGL14.EGL_NO_DISPLAY
        var eglContext = EGL14.EGL_NO_CONTEXT
        var surface = EGL14.EGL_NO_SURFACE
        return try {
            display = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
            if (display == EGL14.EGL_NO_DISPLAY) return null

            val eglVersion = IntArray(2)
            if (!EGL14.eglInitialize(display, eglVersion, 0, eglVersion, 1)) return null

            val renderableBit = if (clientVersion >= 3) {
                0x0040 // EGL_OPENGL_ES3_BIT_KHR
            } else {
                EGL14.EGL_OPENGL_ES2_BIT
            }

            val attribList = intArrayOf(
                EGL14.EGL_RED_SIZE, 8,
                EGL14.EGL_GREEN_SIZE, 8,
                EGL14.EGL_BLUE_SIZE, 8,
                EGL14.EGL_RENDERABLE_TYPE, renderableBit,
                EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
                EGL14.EGL_NONE
            )
            val configs = arrayOfNulls<EGLConfig>(1)
            val numConfig = IntArray(1)
            if (!EGL14.eglChooseConfig(display, attribList, 0, configs, 0, 1, numConfig, 0)) return null
            if (numConfig[0] <= 0) return null
            val config = configs[0] ?: return null

            val contextAttribs = intArrayOf(
                EGL14.EGL_CONTEXT_CLIENT_VERSION, clientVersion,
                EGL14.EGL_NONE
            )
            eglContext = EGL14.eglCreateContext(display, config, EGL14.EGL_NO_CONTEXT, contextAttribs, 0)
            if (eglContext == null || eglContext == EGL14.EGL_NO_CONTEXT) return null

            // 64x64 pbuffer — more reliable than 1x1 on some OEM drivers
            val surfaceAttribs = intArrayOf(
                EGL14.EGL_WIDTH, 64,
                EGL14.EGL_HEIGHT, 64,
                EGL14.EGL_NONE
            )
            surface = EGL14.eglCreatePbufferSurface(display, config, surfaceAttribs, 0)
            if (surface == null || surface == EGL14.EGL_NO_SURFACE) return null

            if (!EGL14.eglMakeCurrent(display, surface, surface, eglContext)) return null

            val renderer = GLES20.glGetString(GLES20.GL_RENDERER)?.trim().orEmpty()
            val vendor = GLES20.glGetString(GLES20.GL_VENDOR)?.trim().orEmpty()
            val version = GLES20.glGetString(GLES20.GL_VERSION)?.trim().orEmpty()

            if (renderer.isBlank()) null
            else GpuGlStrings(renderer = renderer, vendor = vendor, version = version)
        } catch (_: Throwable) {
            null
        } finally {
            try {
                if (display != EGL14.EGL_NO_DISPLAY) {
                    EGL14.eglMakeCurrent(
                        display,
                        EGL14.EGL_NO_SURFACE,
                        EGL14.EGL_NO_SURFACE,
                        EGL14.EGL_NO_CONTEXT
                    )
                    if (surface != EGL14.EGL_NO_SURFACE && surface != null) {
                        EGL14.eglDestroySurface(display, surface)
                    }
                    if (eglContext != EGL14.EGL_NO_CONTEXT && eglContext != null) {
                        EGL14.eglDestroyContext(display, eglContext)
                    }
                    EGL14.eglTerminate(display)
                }
            } catch (_: Throwable) {
            }
        }
    }
}
