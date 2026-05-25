import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/services/contribution_stats_service.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/app_text_styles.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Three-tile stats strip: total commits, current streak, longest streak.
class StatsPanel extends StatelessWidget {
  const StatsPanel({super.key, required this.calendar});

  final ContributionCalendar calendar;

  @override
  Widget build(BuildContext context) {
    final stats = ContributionStatsService.compute(calendar);
    final colors = AppColors.of(context);
    final fmt = NumberFormat.decimalPattern();
    final isCurrentYear = calendar.year.value == DateTime.now().year;

    return Row(
      spacing: Tokens.space2,
      children: [
        Expanded(
          child: _StatTile(
            label: 'TOTAL',
            value: fmt.format(calendar.totalContributions),
            unit: 'commits',
            colors: colors,
          ),
        ),
        Expanded(
          child: _StatTile(
            label: isCurrentYear ? 'CURRENT' : 'FINAL',
            value: stats.currentStreak.toString(),
            unit: 'day streak',
            accent: true,
            colors: colors,
          ),
        ),
        Expanded(
          child: _StatTile(
            label: 'LONGEST',
            value: stats.longestStreak.toString(),
            unit: 'days',
            colors: colors,
          ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.unit,
    required this.colors,
    this.accent = false,
  });

  final String label;
  final String value;
  final String unit;
  final AppColors colors;
  final bool accent;

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
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: AppTextStyles.mono(
              fontSize: Tokens.textXs,
              color: colors.mutedForeground,
              letterSpacing: 0.06,
            ),
          ),
          const SizedBox(height: Tokens.space1),
          Text(
            value,
            style: AppTextStyles.mono(
              fontSize: Tokens.text2Xl,
              fontWeight: FontWeight.w700,
              color: accent ? colors.accent : colors.foreground,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            unit,
            style: TextStyle(
              fontSize: Tokens.textXs,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    ),
  );
}
