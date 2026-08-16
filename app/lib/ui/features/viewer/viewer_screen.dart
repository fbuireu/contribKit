import 'package:contribkit/ui/features/viewer/widgets/contribution_format.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:intl/intl.dart' show NumberFormat;
import 'package:flutter_animate/flutter_animate.dart';
import 'package:contribkit/ui/widgets/app_icons.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/customizer/customizer_sheet.dart';
import 'package:contribkit/ui/features/export/export_sheet.dart';
import 'package:contribkit/ui/features/tip/tip_jar_sheet.dart';
import 'package:contribkit/ui/features/viewer/viewer_notifier.dart';
import 'package:contribkit/ui/features/viewer/viewer_state.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/features/viewer/widgets/stats_panel.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/app_text_styles.dart';
import 'package:contribkit/ui/theme/background_presets.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_card.dart';
import 'package:contribkit/ui/widgets/app_text_field.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ViewerScreen extends ConsumerStatefulWidget {
  const ViewerScreen({super.key});

  @override
  ConsumerState<ViewerScreen> createState() => _ViewerScreenState();
}

class _ViewerScreenState extends ConsumerState<ViewerScreen> {
  late final TextEditingController _usernameController;
  late final FocusNode _usernameFocusNode;
  String _inputError = '';

  @override
  void initState() {
    super.initState();
    FlutterNativeSplash.remove();
    _usernameController = TextEditingController();
    _usernameFocusNode = FocusNode();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _usernameFocusNode.dispose();
    super.dispose();
  }

  void _onSubmit(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return;

    setState(() => _inputError = '');
    try {
      final username = Username(trimmed);
      final year = ref.read(viewerProvider).effectiveYear;
      ref
          .read(viewerProvider.notifier)
          .fetchContributions(username: username, year: year);
    } on ArgumentError catch (e) {
      setState(() => _inputError = e.message.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(viewerProvider);
    final colors = AppColors.of(context);

    if (!state.isLoadingSettings &&
        state.username != null &&
        _usernameController.text.isEmpty) {
      _usernameController.text = state.username!.value;
    }

    return ColoredBox(
      color: colors.background,
      child: SafeArea(
        child: Column(
          children: [
            _Header(colors: colors),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: Tokens.space4,
                  vertical: Tokens.space4,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: Tokens.space4,
                  children: [
                    _UsernameInput(
                      controller: _usernameController,
                      focusNode: _usernameFocusNode,
                      error: _inputError,
                      onSubmit: _onSubmit,
                      isLoading:
                          state.isLoadingSettings || state.isLoadingCalendar,
                    ),
                    const _YearPills(),
                    _Body(state: state),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.colors});

  final AppColors colors;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final icon = themeMode == ThemeMode.light
        ? LucideIcons.sun
        : LucideIcons.moon;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Tokens.space4,
        vertical: Tokens.space3,
      ),
      child: Row(
        children: [
          Image.asset(
            'assets/images/logo.png',
            height: Tokens.logoSize,
            width: Tokens.logoSize,
          ),
          const SizedBox(width: Tokens.space2),
          Text(
            'ContribKit',
            style: TextStyle(
              fontSize: Tokens.textLg,
              fontWeight: FontWeight.w600,
              color: colors.foreground,
              letterSpacing: -0.5,
            ),
          ),
          const Spacer(),
          AppButton.ghost(
            onPressed: () => TipJarSheet.show(context),
            size: AppButtonSize.sm,
            child: Icon(
              LucideIcons.heart,
              size: Tokens.iconSm,
              color: colors.accent,
            ),
          ),
          AppButton.ghost(
            onPressed: () => ref.read(themeModeProvider.notifier).cycle(),
            size: AppButtonSize.sm,
            child: Icon(icon, size: Tokens.iconSm),
          ),
        ],
      ),
    );
  }
}

class _UsernameInput extends StatelessWidget {
  const _UsernameInput({
    required this.controller,
    required this.focusNode,
    required this.error,
    required this.onSubmit,
    required this.isLoading,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String error;
  final ValueChanged<String> onSubmit;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: Tokens.space2,
      children: [
        Row(
          spacing: Tokens.space2,
          children: [
            Expanded(
              child: AppTextField(
                controller: controller,
                focusNode: focusNode,
                placeholder: 'GitHub username',
                onSubmitted: isLoading ? null : onSubmit,
                enabled: !isLoading,
              ),
            ),
            AppButton.ghost(
              enabled: !isLoading,
              onPressed: isLoading ? null : () => onSubmit(controller.text),
              size: AppButtonSize.sm,
              child: isLoading
                  ? const _PulsingDots(dotSize: 5)
                  : Icon(
                      LucideIcons.arrowRight,
                      size: Tokens.iconSm,
                      color: colors.mutedForeground,
                    ),
            ),
          ],
        ),
        if (error.isNotEmpty)
          Text(
            error,
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: AppColors.of(context).destructive,
            ),
          ),
        _Suggestions(
          onSelect: (username) {
            controller.text = username;
            onSubmit(username);
          },
          enabled: !isLoading,
        ),
      ],
    );
  }
}

class _Suggestions extends ConsumerWidget {
  const _Suggestions({required this.onSelect, required this.enabled});

  final ValueChanged<String> onSelect;
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppColors.of(context);
    final suggestionsAsync = ref.watch(suggestedUsernamesProvider);

    return suggestionsAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (names) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          spacing: Tokens.space2,
          children: [
            Text(
              'try:',
              style: AppTextStyles.mono(
                fontSize: Tokens.textXs,
                color: colors.mutedForeground,
              ),
            ),
            for (final name in names)
              _SuggestionChip(
                name: name,
                enabled: enabled,
                onTap: () => onSelect(name),
                colors: colors,
              ),
          ],
        ),
      ),
    );
  }
}

class _SuggestionChip extends StatefulWidget {
  const _SuggestionChip({
    required this.name,
    required this.enabled,
    required this.onTap,
    required this.colors,
  });

  final String name;
  final bool enabled;
  final VoidCallback onTap;
  final AppColors colors;

  @override
  State<_SuggestionChip> createState() => _SuggestionChipState();
}

class _SuggestionChipState extends State<_SuggestionChip> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final active = widget.enabled && !_pressed;
    return GestureDetector(
      onTap: widget.enabled ? widget.onTap : null,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedContainer(
        duration: Tokens.durationFast,
        padding: Tokens.badgePadding,
        decoration: BoxDecoration(
          color: _pressed ? widget.colors.border : widget.colors.muted,
          border: Border.all(color: widget.colors.border),
          borderRadius: BorderRadius.circular(Tokens.radiusFull),
        ),
        child: Text(
          widget.name,
          style: AppTextStyles.mono(
            fontSize: Tokens.textXs,
            color: active
                ? widget.colors.foreground
                : widget.colors.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class _YearPills extends ConsumerWidget {
  const _YearPills();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(viewerProvider);
    final notifier = ref.read(viewerProvider.notifier);
    final colors = AppColors.of(context);
    final currentYear = DateTime.now().year;
    final selectedYear = state.effectiveYear.value;

    final years = List.generate(
      currentYear - Year.minYear + 1,
      (i) => currentYear - i,
    );

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        spacing: Tokens.space1 + 2,
        children: [
          for (final year in years)
            _YearPill(
              year: year,
              isSelected: year == selectedYear,
              colors: colors,
              onTap: () => notifier.setYear(Year(year)),
            ),
        ],
      ),
    );
  }
}

class _YearPill extends StatelessWidget {
  const _YearPill({
    required this.year,
    required this.isSelected,
    required this.colors,
    required this.onTap,
  });

  final int year;
  final bool isSelected;
  final AppColors colors;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: Tokens.durationFast,
        padding: const EdgeInsets.symmetric(
          horizontal: Tokens.space3,
          vertical: Tokens.space2,
        ),
        decoration: BoxDecoration(
          color: isSelected ? colors.muted : AppColors.transparent,
          borderRadius: BorderRadius.circular(Tokens.radiusFull),
          border: Border.all(color: colors.border),
        ),
        child: Text(
          year.toString(),
          style: AppTextStyles.mono(
            fontSize: Tokens.textSm,
            fontWeight: FontWeight.w500,
            color: isSelected ? colors.foreground : colors.mutedForeground,
          ),
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.state});

  final ViewerState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (state.isLoadingSettings || state.isLoadingCalendar) {
      return const _Loader();
    }
    if (state.error != null) {
      return _ErrorState(failure: state.error!);
    }
    if (state.username == null ||
        state.calendar == null ||
        state.palette == null) {
      return const _EmptyState();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: Tokens.space4,
      children: [
        _CalendarCard(state: state),
        StatsPanel(calendar: state.calendar!, stats: state.stats!),
        _ActionRow(state: state),
      ],
    );
  }
}

final _contribFmt = NumberFormat.decimalPattern();

class _CalendarCard extends ConsumerWidget {
  const _CalendarCard({required this.state});

  final ViewerState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppColors.of(context);
    final gridBg =
        BackgroundPresets.colors[state.backgroundPreset] ?? colors.card;

    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Tokens.space4,
              Tokens.space4,
              Tokens.space2,
              Tokens.space2,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'CONTRIBUTIONS · ${state.effectiveYear.value}',
                    style: AppTextStyles.mono(
                      fontSize: Tokens.textXs,
                      color: colors.mutedForeground,
                      letterSpacing: 0.04,
                    ),
                  ),
                ),
                Text(
                  '${formatTotalContributions(format: _contribFmt, total: state.calendar!.totalContributions)} commits',
                  style: AppTextStyles.mono(
                    fontSize: Tokens.textXs,
                    color: colors.accent,
                  ),
                ),
                if (state.fromCache) ...[
                  const SizedBox(width: Tokens.space2),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(Tokens.radiusFull),
                      border: Border.all(color: colors.border),
                    ),
                    child: Padding(
                      padding: Tokens.pillPadding,
                      child: Text(
                        'cached',
                        style: AppTextStyles.mono(
                          fontSize: Tokens.textXs,
                          color: colors.mutedForeground,
                        ),
                      ),
                    ),
                  ),
                ],
                AppButton.ghost(
                  onPressed: state.isLoadingCalendar
                      ? null
                      : () => ref
                            .read(viewerProvider.notifier)
                            .refreshContributions(),
                  size: AppButtonSize.sm,
                  child: const Icon(LucideIcons.refreshCw, size: Tokens.iconXs),
                ),
              ],
            ),
          ),
          ColoredBox(
            color: gridBg,
            child: ContributionGrid(
              calendar: state.calendar!,
              palette: state.palette!,
              shape: state.cellShape,
              cellSize: state.cellSize,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({required this.state});

  final ViewerState state;

  @override
  Widget build(BuildContext context) {
    return Row(
      spacing: Tokens.space2,
      children: [
        Expanded(
          child: AppButton(
            onPressed: () => CustomizerSheet.show(context),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.sliders, size: Tokens.iconSm),
                SizedBox(width: Tokens.space2),
                Text('Customize'),
              ],
            ),
          ),
        ),
        Expanded(
          child: AppButton.outline(
            onPressed: () => ExportSheet.show(
              context,
              calendar: state.calendar!,
              palette: state.palette!,
              cellShape: state.cellShape,
              cellSize: state.cellSize,
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.download, size: Tokens.iconSm),
                SizedBox(width: Tokens.space2),
                Text('Export'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Loader extends StatelessWidget {
  const _Loader();

  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(Tokens.space8),
      child: _PulsingDots(dotSize: 8),
    ),
  );
}

class _PulsingDots extends StatelessWidget {
  const _PulsingDots({required this.dotSize});

  final double dotSize;

  @override
  Widget build(BuildContext context) {
    final color = AppColors.of(context).mutedForeground;
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: dotSize * 0.8,
      children: [
        for (final delay in Tokens.pulseDotDelays)
          Container(
                width: dotSize,
                height: dotSize,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(
                begin: 0.4,
                end: 1.0,
                duration: Tokens.durationEntrance,
                delay: delay,
                curve: Curves.easeInOut,
              )
              .fade(
                begin: 0.3,
                end: 1.0,
                duration: Tokens.durationEntrance,
                delay: delay,
                curve: Curves.easeInOut,
              ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.failure});

  final Failure failure;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(Tokens.space8),
      child: Text(
        FailureMessage.of(failure),
        style: TextStyle(
          fontSize: Tokens.textBase,
          color: AppColors.of(context).destructive,
        ),
        textAlign: TextAlign.center,
      ),
    ),
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(Tokens.space8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Your GitHub activity.\nYour aesthetic.',
            style: TextStyle(
              fontSize: Tokens.textXl,
              fontWeight: FontWeight.w700,
              color: AppColors.of(context).foreground,
              letterSpacing: -0.5,
              height: 1.15,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: Tokens.space3),
          Text(
            'Paste any GitHub username above to visualize, customize, and export their contribution calendar — no token required.',
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: AppColors.of(context).mutedForeground,
              height: 1.55,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}
