package com.fbuireu.contribkit

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import kotlin.math.roundToInt

class ContribKitWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        val pending = goAsync()
        Thread {
            try {
                appWidgetIds.forEach { widgetId ->
                    updateWidget(context, appWidgetManager, widgetId)
                }
            } finally {
                pending.finish()
            }
        }.start()
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle,
    ) {
        val pending = goAsync()
        Thread {
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } finally {
                pending.finish()
            }
        }.start()
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
    ) {
        try {
            val views = RemoteViews(context.packageName, R.layout.contribkit_widget)

            val prefs = context.getSharedPreferences("HomeWidgetPreferences", Context.MODE_PRIVATE)
            val imagePath = prefs.getString("calendar_image_path", null)
            val username = prefs.getString("widget_username", null)
            val streak = prefs.getAll()["widget_streak"]
            val totalContributions = prefs.getAll()["widget_total_contributions"]

            if (username != null) {
                views.setTextViewText(R.id.widget_username, username)
            }

            val streakInt = when (streak) {
                is Int -> streak
                is Long -> streak.toInt()
                else -> 0
            }
            views.setTextViewText(R.id.widget_streak_count, streakInt.toString())

            val totalInt = when (totalContributions) {
                is Int -> totalContributions
                is Long -> totalContributions.toInt()
                else -> 0
            }
            if (totalInt > 0) {
                val formatted = "%,d contributions this year".format(totalInt)
                views.setTextViewText(R.id.widget_contributions, formatted)
            }

            // Track bitmaps for recycling AFTER updateAppWidget to avoid
            // IllegalStateException when RemoteViews parcels the bitmap.
            var bitmapRef: Bitmap? = null
            var rawRef: Bitmap? = null

            if (imagePath != null) {
                val raw = BitmapFactory.decodeFile(imagePath)
                if (raw != null) {
                    val bitmap = fitBitmapToContainerWidth(context, appWidgetManager, widgetId, raw)
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    views.setViewVisibility(R.id.widget_image, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_placeholder, View.GONE)
                    bitmapRef = bitmap
                    rawRef = raw
                }
            }

            val intent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            appWidgetManager.updateAppWidget(widgetId, views)

            // Recycle only after the Binder parcel is done.
            bitmapRef?.let { b ->
                rawRef?.let { r -> if (r !== b) r.recycle() }
                b.recycle()
            }
        } catch (e: Exception) {
            Log.e("ContribKitWidget", "updateWidget failed for id=$widgetId", e)
        }
    }

    /**
     * Scales [src] to fill the widget's available image area width without distortion.
     *
     * Uses fitCenter math against the actual allocated widget dimensions. When the
     * calendar's natural aspect ratio is narrower than the container (e.g. a partial
     * year with few weeks), the scaled bitmap is right-padded with transparent pixels
     * so the ImageView always fills the full card width. The transparent area reveals
     * the card background color beneath the ImageView.
     *
     * Falls back to a 800px-wide cap if widget dimensions are unavailable.
     */
    private fun fitBitmapToContainerWidth(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
        src: Bitmap,
    ): Bitmap {
        val opts = appWidgetManager.getAppWidgetOptions(widgetId)
        val widgetWDp = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val widgetHDp = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)

        val density = context.resources.displayMetrics.density

        // All inset values in dp; converted to px below.
        val horzInsetDp = (8 + 12) * 2          // outer 8dp + inner 12dp, both sides
        val vertInsetDp = (8 + 12) * 2 + 14 + 7 + 16  // same + header + margin + footer

        val containerW = if (widgetWDp > 0)
            ((widgetWDp - horzInsetDp) * density).roundToInt().coerceAtLeast(80)
        else 800

        val containerH = if (widgetHDp > 0)
            ((widgetHDp - vertInsetDp) * density).roundToInt().coerceAtLeast(20)
        else (containerW / 5)  // rough fallback: assume 5:1 aspect

        val scaleX = containerW.toFloat() / src.width
        val scaleY = containerH.toFloat() / src.height
        val scale  = minOf(scaleX, scaleY)

        val targetW = (src.width  * scale).roundToInt().coerceAtLeast(1)
        val targetH = (src.height * scale).roundToInt().coerceAtLeast(1)

        val scaled = if (targetW != src.width || targetH != src.height)
            Bitmap.createScaledBitmap(src, targetW, targetH, true)
        else src

        // If the calendar doesn't fill the full container width (happens when the
        // calendar is a partial year and the widget is taller relative to its width),
        // pad the right side with transparent pixels.
        return if (targetW < containerW) {
            val padded = Bitmap.createBitmap(containerW, targetH, Bitmap.Config.ARGB_8888)
            Canvas(padded).drawBitmap(scaled, 0f, 0f, null)
            if (scaled !== src) scaled.recycle()
            padded
        } else {
            scaled
        }
    }
}
