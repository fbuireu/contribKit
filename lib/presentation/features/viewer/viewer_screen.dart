import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/presentation/di/providers.dart';
import 'package:contribkit/presentation/features/customizer/widgets/background_picker.dart';
import 'package:contribkit/presentation/features/customizer/widgets/palette_picker.dart';
import 'package:contribkit/presentation/features/customizer/widgets/shape_picker.dart';
import 'package:contribkit/presentation/features/customizer/widgets/size_picker.dart';
import 'package:contribkit/presentation/features/export/export_panel.dart';
import 'package:contribkit/presentation/theme/background_presets.dart';
import 'package:contribkit/presentation/features/viewer/viewer_notifier.dart';
import 'package:contribkit/presentation/features/viewer/viewer_state.dart';
import 'package:contribkit/presentation/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/presentation/features/viewer/widgets/stats_panel.dart';
import 'package:contribkit/presentation/theme/app_colors.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:contribkit/presentation/widgets/app_badge.dart';
import 'package:contribkit/presentation/widgets/app_button.dart';
import 'package:contribkit/presentation/widgets/app_card.dart';
import 'package:contribkit/presentation/widgets/app_text_field.dart';
import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

/// The primary screen: username input, contribution grid, and customizer.
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

    // Sync text field once settings load
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
                    _SearchBar(
                      controller: _usernameController,
                      focusNode: _usernameFocusNode,
                      error: _inputError,
                      onSubmit: _onSubmit,
                      isLoadingSettings: state.isLoadingSettings,
                      isLoadingCalendar: state.isLoadingCalendar,
                      selectedYear: state.effectiveYear,
                    ),
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
    final icon = switch (themeMode) {
      ThemeMode.system => LucideIcons.monitor,
      ThemeMode.light => LucideIcons.sun,
      ThemeMode.dark => LucideIcons.moon,
    };

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Tokens.space4,
        vertical: Tokens.space3,
      ),
      child: Row(
        children: [
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
            onPressed: () => ref.read(themeModeProvider.notifier).cycle(),
            size: ShadButtonSize.sm,
            child: Icon(icon, size: 16),
          ),
        ],
      ),
    );
  }
}

class _SearchBar extends ConsumerWidget {
  const _SearchBar({
    required this.controller,
    required this.focusNode,
    required this.error,
    required this.onSubmit,
    required this.isLoadingSettings,
    required this.isLoadingCalendar,
    required this.selectedYear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String error;
  final ValueChanged<String> onSubmit;
  final bool isLoadingSettings;
  final bool isLoadingCalendar;
  final Year selectedYear;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(viewerProvider.notifier);
    final canGoPrev = selectedYear.value > Year.minYear;
    final canGoNext = selectedYear.value < DateTime.now().year;
    final isLoading = isLoadingSettings || isLoadingCalendar;

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
                enabled: !isLoadingSettings,
              ),
            ),
            _YearStepper(
              year: selectedYear,
              canGoPrev: canGoPrev && !isLoading,
              canGoNext: canGoNext && !isLoading,
              onPrev: () => notifier.setYear(Year(selectedYear.value - 1)),
              onNext: () => notifier.setYear(Year(selectedYear.value + 1)),
            ),
          ],
        ),
        AppButton(
          onPressed: isLoading ? null : () => onSubmit(controller.text),
          child: isLoadingCalendar
              ? const _PulsingDots(dotSize: 5)
              : const Text('Search'),
        ),
        if (error.isNotEmpty)
          Text(
            error,
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: ShadTheme.of(context).colorScheme.destructive,
            ),
          ),
      ],
    );
  }
}

class _YearStepper extends StatelessWidget {
  const _YearStepper({
    required this.year,
    required this.canGoPrev,
    required this.canGoNext,
    required this.onPrev,
    required this.onNext,
  });

  final Year year;
  final bool canGoPrev;
  final bool canGoNext;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      AppButton.ghost(
        onPressed: canGoPrev ? onPrev : null,
        size: ShadButtonSize.sm,
        child: const Icon(LucideIcons.chevronLeft, size: 16.0),
      ),
      Text(
        year.value.toString(),
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: Tokens.textSm,
          fontWeight: FontWeight.w500,
        ),
      ),
      AppButton.ghost(
        onPressed: canGoNext ? onNext : null,
        size: ShadButtonSize.sm,
        child: const Icon(LucideIcons.chevronRight, size: 16.0),
      ),
    ],
  );
}

class _Body extends ConsumerWidget {
  const _Body({required this.state});

  final ViewerState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (state.isLoadingSettings) {
      return const _Loader();
    }
    if (state.error != null) {
      return _ErrorState(failure: state.error!);
    }
    if (state.username == null || state.calendar == null) {
      return const _EmptyState();
    }

    final notifier = ref.read(viewerProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: Tokens.space4,
      children: [
        _CalendarCard(state: state),
        StatsPanel(calendar: state.calendar!),
        _CustomizerCard(state: state, notifier: notifier),
        ExportPanel(
          calendar: state.calendar!,
          palette: state.effectivePalette,
          cellShape: state.cellShape,
          cellSize: state.cellSize,
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

  static const _delays = [0, 160, 320];

  @override
  Widget build(BuildContext context) {
    final color = AppColors.of(context).mutedForeground;
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: dotSize * 0.8,
      children: [
        for (final delay in _delays)
          Container(
                width: dotSize,
                height: dotSize,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(
                begin: 0.4,
                end: 1.0,
                duration: 500.ms,
                delay: Duration(milliseconds: delay),
                curve: Curves.easeInOut,
              )
              .fade(
                begin: 0.3,
                end: 1.0,
                duration: 500.ms,
                delay: Duration(milliseconds: delay),
                curve: Curves.easeInOut,
              ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.failure});

  final Failure failure;

  String _message() => switch (failure) {
    NotFoundFailure(:final username) => 'User "$username" not found.',
    RateLimitedFailure() => 'GitHub rate limit exceeded. Try again later.',
    NetworkFailure(:final message) => 'Network error: $message',
    _ => 'Something went wrong. Please try again.',
  };

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(Tokens.space8),
      child: Text(
        _message(),
        style: TextStyle(
          fontSize: Tokens.textBase,
          color: ShadTheme.of(context).colorScheme.destructive,
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
      child: Text(
        'Enter a GitHub username to visualize contributions',
        style: TextStyle(
          fontSize: Tokens.textBase,
          color: AppColors.of(context).mutedForeground,
        ),
        textAlign: TextAlign.center,
      ),
    ),
  );
}

class _CalendarCard extends ConsumerWidget {
  const _CalendarCard({required this.state});

  final ViewerState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppColors.of(context);
    final gridBg =
        BackgroundPresets.colors[state.cardBackground] ?? colors.card;

    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Tokens.space4,
              Tokens.space4,
              Tokens.space4,
              Tokens.space2,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${state.username!.value} · ${state.effectiveYear.value}',
                    style: const TextStyle(
                      fontSize: Tokens.textBase,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                AppBadge(
                  child: Text(
                    '${state.calendar!.totalContributions} contributions',
                  ),
                ),
                if (state.fromCache) ...[
                  const SizedBox(width: Tokens.space2),
                  const AppBadge.outline(child: Text('cached')),
                ],
                const SizedBox(width: Tokens.space2),
                AppButton.ghost(
                  onPressed: state.isLoadingCalendar
                      ? null
                      : () => ref
                            .read(viewerProvider.notifier)
                            .refreshContributions(),
                  size: ShadButtonSize.sm,
                  child: const Icon(LucideIcons.refreshCw, size: 14),
                ),
              ],
            ),
          ),
          ColoredBox(
            color: gridBg,
            child: ContributionGrid(
              calendar: state.calendar!,
              palette: state.effectivePalette,
              shape: state.cellShape,
              cellSize: state.cellSize,
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomizerCard extends StatelessWidget {
  const _CustomizerCard({required this.state, required this.notifier});

  final ViewerState state;
  final ViewerNotifier notifier;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: Tokens.space4,
      children: [
        PalettePicker(
          selected: state.effectivePalette,
          onSelected: notifier.setPalette,
        ),
        ShapePicker(
          selected: state.cellShape,
          onSelected: notifier.setCellShape,
        ),
        SizePicker(
          selected: state.cellSize,
          onSelected: notifier.setCellSize,
        ),
        BackgroundPicker(
          selected: state.cardBackground,
          onSelected: notifier.setCardBackground,
        ),
      ],
    ),
  );
}
