package com.ffsensitivity.app.presentation.screens

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ffsensitivity.app.data.remote.ApiClient
import com.ffsensitivity.app.presentation.theme.Amber
import com.ffsensitivity.app.presentation.theme.AmberHot
import com.ffsensitivity.app.presentation.theme.SurfaceCard
import com.ffsensitivity.app.util.AppLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request

@Composable
internal fun ProfileAvatar(name: String, photoUrl: String) {
    var photo by remember(photoUrl) { mutableStateOf<androidx.compose.ui.graphics.ImageBitmap?>(null) }
    LaunchedEffect(photoUrl) {
        photo = withContext(Dispatchers.IO) { loadPhoto(photoUrl) }
    }
    val letter = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "P"
    Box(
        modifier = Modifier
            .size(64.dp)
            .clip(CircleShape)
            .background(SurfaceCard)
            .border(1.dp, Amber.copy(alpha = 0.45f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        val bitmap = photo
        if (bitmap != null) {
            Image(
                bitmap = bitmap,
                contentDescription = "Google photo",
                modifier = Modifier.size(64.dp),
                contentScale = ContentScale.Crop
            )
        } else {
            Text(letter, color = AmberHot, fontSize = 22.sp, fontWeight = FontWeight.Black)
        }
    }
}

private fun loadPhoto(url: String): androidx.compose.ui.graphics.ImageBitmap? {
    if (!url.startsWith("https://")) return null
    return runCatching {
        val req = Request.Builder().url(url).get().build()
        ApiClient.http.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) return null
            val bytes = resp.body?.bytes() ?: return null
            if (bytes.size > 1_500_000) return null
            val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
            bmp.asImageBitmap()
        }
    }.getOrElse {
        AppLog.e("Profile photo load failed", it)
        null
    }
}
