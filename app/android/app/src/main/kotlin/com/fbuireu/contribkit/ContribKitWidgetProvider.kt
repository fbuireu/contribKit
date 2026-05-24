package com.fbuireu.contribkit

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.app.PendingIntent
import android.graphics.BitmapFactory
import android.view.View
import android.widget.RemoteViews

class ContribKitWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        appWidgetIds.forEach { widgetId ->
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
    ) {
        val views = RemoteViews(context.packageName, R.layout.contribkit_widget)

        val prefs = context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
        val imagePath = prefs.getString("flutter.calendar_image_path", null)
        val username = prefs.getString("flutter.widget_username", null)
        val streak = prefs.getInt("flutter.widget_streak", 0)
        val totalContributions = prefs.getInt("flutter.widget_total_contributions", 0)

        if (username != null) {
            views.setTextViewText(R.id.widget_username, username)
        }

        views.setTextViewText(R.id.widget_streak_count, streak.toString())

        if (totalContributions > 0) {
            val formatted = "%,d contributions this year".format(totalContributions)
            views.setTextViewText(R.id.widget_contributions, formatted)
        }

        if (imagePath != null) {
            val bitmap = BitmapFactory.decodeFile(imagePath)
            if (bitmap != null) {
                views.setImageViewBitmap(R.id.widget_image, bitmap)
                views.setViewVisibility(R.id.widget_image, View.VISIBLE)
                views.setViewVisibility(R.id.widget_placeholder, View.GONE)
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
    }
}
