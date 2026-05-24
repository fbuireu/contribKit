import 'dart:convert';

import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_card.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shadcn_ui/shadcn_ui.dart';
import 'package:share_plus/share_plus.dart';

/// Bottom panel with export format buttons and clipboard copy for Markdown.
class ExportPanel extends ConsumerStatefulWidget {
  const ExportPanel({
    super.key,
    required this.calendar,
    required this.palette,
    required this.cellShape,
    required this.cellSize,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape cellShape;
  final CellSize cellSize;

  @override
  ConsumerState<ExportPanel> createState() => _ExportPanelState();
}

class _ExportFormatButton extends StatelessWidget {
  const _ExportFormatButton({
    required this.label,
    required this.sublabel,
    required this.colors,
    required this.disabled,
    required this.onTap,
  });

  final String label;
  final String sublabel;
  final AppColors colors;
  final bool disabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: disabled ? null : onTap,
    child: AnimatedOpacity(
      duration: Tokens.durationFast,
      opacity: disabled ? 0.45 : 1.0,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.muted,
          borderRadius: BorderRadius.circular(Tokens.radiusMd),
          border: Border.all(color: colors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: Tokens.space3,
            vertical: Tokens.space2,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: Tokens.textSm,
                  fontWeight: FontWeight.w600,
                  color: colors.foreground,
                ),
              ),
              Text(
                sublabel,
                style: TextStyle(
                  fontSize: Tokens.textXs,
                  color: colors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _ExportPanelState extends ConsumerState<ExportPanel> {
  bool _exporting = false;
  bool _copied = false;

  RenderOptions get _options => RenderOptions(
    palette: widget.palette,
    shape: widget.cellShape,
    cellSize: widget.cellSize.pixels,
    gap: widget.cellSize.gap,
  );

  Future<void> _export({
    required ExportCalendar useCase,
    required String filename,
    required String mimeType,
  }) async {
    if (_exporting) return;
    setState(() => _exporting = true);

    try {
      final bytes = await useCase(calendar: widget.calendar, options: _options);
      final xFile = XFile.fromData(
        Uint8List.fromList(bytes),
        name: filename,
        mimeType: mimeType,
      );
      await SharePlus.instance.share(ShareParams(files: [xFile]));
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _copyMarkdown(ExportCalendar useCase) async {
    if (_exporting) return;
    setState(() => _exporting = true);

    try {
      final bytes = await useCase(calendar: widget.calendar, options: _options);
      await Clipboard.setData(ClipboardData(text: utf8.decode(bytes)));
      if (mounted) {
        setState(() => _copied = true);
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (mounted) setState(() => _copied = false);
        });
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final svg = ref.read(svgExportCalendarProvider);
    final png = ref.read(pngExportCalendarProvider);
    final md = ref.read(markdownExportCalendarProvider);
    final user = widget.calendar.username.value;
    final year = widget.calendar.year.value;

    final colors = AppColors.of(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: Tokens.space3,
        children: [
          Text(
            'Export',
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: ShadTheme.of(context).colorScheme.mutedForeground,
            ),
          ),
          Row(
            spacing: Tokens.space2,
            children: [
              _ExportFormatButton(
                label: 'SVG',
                sublabel: 'vector',
                colors: colors,
                disabled: _exporting,
                onTap: () => _export(
                  useCase: svg,
                  filename: '${user}_$year.svg',
                  mimeType: 'image/svg+xml',
                ),
              ),
              _ExportFormatButton(
                label: 'PNG',
                sublabel: 'image',
                colors: colors,
                disabled: _exporting,
                onTap: () => _export(
                  useCase: png,
                  filename: '${user}_$year.png',
                  mimeType: 'image/png',
                ),
              ),
              _ExportFormatButton(
                label: 'MD',
                sublabel: 'markdown',
                colors: colors,
                disabled: _exporting,
                onTap: () => _export(
                  useCase: md,
                  filename: '${user}_$year.md',
                  mimeType: 'text/markdown',
                ),
              ),
              const Spacer(),
              AppButton.ghost(
                onPressed: _exporting ? null : () => _copyMarkdown(md),
                size: ShadButtonSize.sm,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: Tokens.space1,
                  children: [
                    Icon(
                      _copied ? LucideIcons.check : LucideIcons.copy,
                      size: 14,
                    ),
                    Text(_copied ? 'Copied' : 'Copy MD'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
