package com.fbuireu.contribkit

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
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
                    val bitmap = scaleBitmapForWidget(context, appWidgetManager, widgetId, raw)
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

    private fun scaleBitmapForWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
        src: Bitmap,
    ): Bitmap {
        val opts = appWidgetManager.getAppWidgetOptions(widgetId)
        val widgetWDp = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val density = context.resources.displayMetrics.density

        val horzInsetDp = (8 + 12) * 2

        val targetW = if (widgetWDp > 0)
            ((widgetWDp - horzInsetDp) * density).roundToInt().coerceIn(80, 1600)
        else 1000

        if (src.width <= targetW) return src

        val scale = targetW.toFloat() / src.width
        val targetH = (src.height * scale).roundToInt().coerceAtLeast(1)

        return Bitmap.createScaledBitmap(src, targetW, targetH, true)
    }
}
