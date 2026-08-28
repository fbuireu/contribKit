package com.fbuireu.contribkit

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetPlugin
import kotlin.math.cos
import kotlin.math.sin

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

            val prefs = HomeWidgetPlugin.getData(context)
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

            val totalText = totalContributions as? String
            if (totalText != null) {
                views.setTextViewText(R.id.widget_contributions, totalText)
            }

            val levels = prefs.getString("widget_levels", null)
            val weeksRaw = prefs.getAll()["widget_weeks"]
            val weeks = when (weeksRaw) {
                is Int -> weeksRaw
                is Long -> weeksRaw.toInt()
                else -> 0
            }
            val colorsStr = prefs.getString("widget_colors", null)
            val shape = prefs.getString("widget_shape", "rounded") ?: "rounded"

            var bitmapRef: Bitmap? = null

            if (levels != null && weeks > 0 && colorsStr != null) {
                val colors = colorsStr.split(",")
                    .mapNotNull { it.trim().toLongOrNull()?.toInt() }
                    .toIntArray()
                if (colors.isNotEmpty()) {
                    val bitmap = renderGrid(
                        appWidgetManager, widgetId, levels, weeks, colors, shape,
                    )
                    views.setImageViewBitmap(R.id.widget_image, bitmap)
                    views.setViewVisibility(R.id.widget_image, View.VISIBLE)
                    views.setViewVisibility(R.id.widget_placeholder, View.GONE)
                    bitmapRef = bitmap
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

            bitmapRef?.recycle()
        } catch (e: Exception) {
            Log.e("ContribKitWidget", "updateWidget failed for id=$widgetId", e)
        }
    }

    private fun renderGrid(
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
        levels: String,
        weeks: Int,
        colors: IntArray,
        shape: String,
    ): Bitmap {
        val opts = appWidgetManager.getAppWidgetOptions(widgetId)
        val wDp = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val hDp = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)

        val areaAspect = if (wDp > 0 && hDp > 0)
            ((wDp - 40).toFloat() / (hDp - 84).coerceAtLeast(1))
                .coerceIn(0.5f, 12f)
        else 3.0f

        val rows = 7
        val cell = 20
        val gap = 3
        val bmpH = rows * cell + (rows - 1) * gap

        val targetW = areaAspect * bmpH
        val colsThatFit = (((targetW + gap) / (cell + gap)).toInt()).coerceAtLeast(1)
        val outCols = minOf(colsThatFit, weeks).coerceAtLeast(1)
        val bmpW = outCols * cell + (outCols - 1) * gap

        val bmp = Bitmap.createBitmap(bmpW, bmpH, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        for (j in 0 until outCols) {
            val start = (j.toLong() * weeks / outCols).toInt()
            val end = (((j + 1).toLong() * weeks / outCols).toInt())
                .coerceIn(start + 1, weeks)
            for (r in 0 until rows) {
                var level = 0
                for (w in start until end) {
                    val idx = w * 7 + r
                    if (idx < levels.length) {
                        val c = levels[idx] - '0'
                        if (c > level) level = c
                    }
                }
                paint.color = colors[level.coerceIn(0, colors.size - 1)]
                val x = (j * (cell + gap)).toFloat()
                val y = (r * (cell + gap)).toFloat()
                drawCell(canvas, paint, shape, x, y, cell.toFloat(), level)
            }
        }

        return bmp
    }

    private fun drawCell(
        canvas: Canvas,
        paint: Paint,
        shape: String,
        x: Float,
        y: Float,
        size: Float,
        level: Int,
    ) {
        val cx = x + size / 2
        val cy = y + size / 2
        when (shape) {
            "square" -> canvas.drawRect(x, y, x + size, y + size, paint)
            "circle" -> canvas.drawCircle(cx, cy, size / 2, paint)
            "dot" -> {
                val r = (if (level == 0) 1.4f else 1.4f + level) * (size / 10f)
                canvas.drawCircle(cx, cy, r, paint)
            }
            "hex" -> canvas.drawPath(hexPath(cx, cy, size / 2), paint)
            else -> canvas.drawRoundRect(
                x, y, x + size, y + size, size * 0.2f, size * 0.2f, paint,
            )
        }
    }

    private fun hexPath(cx: Float, cy: Float, r: Float): Path {
        val path = Path()
        for (i in 0 until 6) {
            val angle = (Math.PI / 3) * i + Math.PI / 6
            val px = cx + r * cos(angle).toFloat()
            val py = cy + r * sin(angle).toFloat()
            if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
        }
        path.close()
        return path
    }
}
