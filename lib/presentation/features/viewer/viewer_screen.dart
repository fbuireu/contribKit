import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/presentation/features/customizer/widgets/palette_picker.dart';
import 'package:contribkit/presentation/features/customizer/widgets/shape_picker.dart';
import 'package:contribkit/presentation/features/export/export_panel.dart';
import 'package:contribkit/presentation/features/viewer/viewer_notifier.dart';
import 'package:contribkit/presentation/features/viewer/viewer_state.dart';
import 'package:contribkit/presentation/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/presentation/theme/app_colors.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:contribkit/presentation/widgets/app_badge.dart';
import 'package:contribkit/presentation/widgets/app_button.dart';
import 'package:contribkit/presentation/widgets/app_card.dart';
import 'package:contribkit/presentation/widgets/app_text_field.dart';
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
                      isLoading: state.isLoadingSettings,
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

class _Header extends StatelessWidget {
  const _Header({required this.colors});

  final AppColors colors;

  @override
  Widget build(BuildContext context) => Padding(
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
          ],
        ),
      );
}

class _SearchBar extends ConsumerWidget {
  const _SearchBar({
    required this.controller,
    required this.focusNode,
    required this.error,
    required this.onSubmit,
    required this.isLoading,
    required this.selectedYear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String error;
  final ValueChanged<String> onSubmit;
  final bool isLoading;
  final Year selectedYear;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(viewerProvider.notifier);
    final canGoPrev = selectedYear.value > Year.minYear;
    final canGoNext = selectedYear.value < DateTime.now().year;

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
                onSubmitted: onSubmit,
                enabled: !isLoading,
              ),
            ),
            _YearStepper(
              year: selectedYear,
              canGoPrev: canGoPrev,
              canGoNext: canGoNext,
              onPrev: () => notifier.setYear(Year(selectedYear.value - 1)),
              onNext: () => notifier.setYear(Year(selectedYear.value + 1)),
            ),
            AppButton(
              onPressed: isLoading ? null : () => onSubmit(controller.text),
              child: const Text('Search'),
            ),
          ],
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
          SizedBox(
            width: Tokens.space8,
            child: Text(
              year.value.toString(),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: Tokens.textSm,
                fontWeight: FontWeight.w500,
              ),
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
    if (state.isLoadingSettings) return const _Loader();
    if (state.username == null) return const _EmptyState();
    if (state.calendar == null) return const _Loader();

    final notifier = ref.read(viewerProvider.notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: Tokens.space4,
      children: [
        _CalendarCard(state: state),
        _CustomizerCard(state: state, notifier: notifier),
        ExportPanel(
          calendar: state.calendar!,
          palette: state.effectivePalette,
          cellShape: state.cellShape,
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
          child: ShadProgress(),
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

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({required this.state});

  final ViewerState state;

  @override
  Widget build(BuildContext context) => AppCard(
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
                ],
              ),
            ),
            ContributionGrid(
              calendar: state.calendar!,
              palette: state.effectivePalette,
              shape: state.cellShape,
            ),
          ],
        ),
      );
}

class _CustomizerCard extends StatelessWidget {
  const _CustomizerCard({
    required this.state,
    required this.notifier,
  });

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
          ],
        ),
      );
}
