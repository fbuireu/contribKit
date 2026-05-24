import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/services/contribution_stats_service.dart';
import 'package:contribkit/domain/value_objects/contribution_stats.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/app_text_styles.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Displays six key contribution statistics in a 2-column grid.
class StatsPanel extends StatelessWidget {
  const StatsPanel({super.key, required this.calendar});

  final ContributionCalendar calendar;

  @override
  Widget build(BuildContext context) {
    final stats = ContributionStatsService.compute(calendar);
    final colors = AppColors.of(context);

    final tiles = [
      (label: 'Current streak', value: '${stats.currentStreak}d'),
      (label: 'Longest streak', value: '${stats.longestStreak}d'),
      (label: 'Best day', value: _bestDayLabel(stats)),
      (label: 'Weekly avg', value: stats.weeklyAverage.toStringAsFixed(1)),
      (label: 'Days active', value: stats.totalDaysActive.toString()),
      (label: 'Best month', value: _bestMonthLabel(stats)),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < tiles.length; i += 2) ...[
          if (i > 0) const SizedBox(height: Tokens.space2),
          Row(
            children: [
              Expanded(
                child: _StatTile(
                  label: tiles[i].label,
                  value: tiles[i].value,
                  colors: colors,
                ),
              ),
              const SizedBox(width: Tokens.space2),
              Expanded(
                child: _StatTile(
                  label: tiles[i + 1].label,
                  value: tiles[i + 1].value,
                  colors: colors,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  String _bestDayLabel(ContributionStats stats) {
    if (stats.bestDayDate == null || stats.bestDayCount == 0) return '—';
    final d = stats.bestDayDate!;
    final month = DateFormat.MMM().format(d);
    return '${stats.bestDayCount} · $month ${d.day}';
  }

  String _bestMonthLabel(ContributionStats stats) {
    if (stats.bestMonthIndex == null || stats.bestMonthContributions == 0) {
      return '—';
    }
    final month = DateFormat.MMMM().format(DateTime(0, stats.bestMonthIndex!));
    return '$month · ${stats.bestMonthContributions}';
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.colors,
  });

  final String label;
  final String value;
  final AppColors colors;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: colors.card,
      borderRadius: BorderRadius.circular(Tokens.radiusMd),
      border: Border.all(color: colors.border),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Tokens.space3,
        vertical: Tokens.space3,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: Tokens.textXs,
              color: colors.mutedForeground,
            ),
          ),
          const SizedBox(height: Tokens.space1),
          Text(
            value,
            style: AppTextStyles.mono(
              fontSize: Tokens.textLg,
              fontWeight: FontWeight.w600,
              color: colors.foreground,
            ),
          ),
        ],
      ),
    ),
  );
}
