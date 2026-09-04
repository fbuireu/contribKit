import 'dart:async';
import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/app_text_styles.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_icons.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ExportSheet extends ConsumerStatefulWidget {
  const ExportSheet({
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

  static Future<void> show(
    BuildContext context, {
    required ContributionCalendar calendar,
    required Palette palette,
    required CellShape cellShape,
    required CellSize cellSize,
  }) => AppSheet.showBottom(
    context: context,
    builder: (_) => ExportSheet(
      calendar: calendar,
      palette: palette,
      cellShape: cellShape,
      cellSize: cellSize,
    ),
  );

  @override
  ConsumerState<ExportSheet> createState() => _ExportSheetState();
}

class _ExportSheetState extends ConsumerState<ExportSheet> {
  ExportFormat _selected = ExportFormat.fallback;
  bool _exporting = false;
  bool _copied = false;
  String? _exportError;
  Timer? _copiedTimer;

  @override
  void dispose() {
    _copiedTimer?.cancel();
    super.dispose();
  }

  void _showCopied() {
    _copiedTimer?.cancel();
    setState(() => _copied = true);
    _copiedTimer = Timer(Tokens.durationCopiedFeedback, () {
      if (mounted) setState(() => _copied = false);
    });
  }

  IconData get _actionIcon => _copied
      ? LucideIcons.check
      : _selected.isCopiedAsText
      ? LucideIcons.copy
      : LucideIcons.share;

  String get _actionLabel => _copied
      ? 'Copied!'
      : _selected.isCopiedAsText
      ? 'Copy ${_selected.label}'
      : 'Share ${_selected.label}';

  RenderOptions get _options => RenderOptions(
    palette: widget.palette,
    shape: widget.cellShape,
    namedSize: widget.cellSize,
  );

  Future<void> _save() async {
    if (_exporting) return;
    setState(() {
      _exporting = true;
      _exportError = null;
    });
    try {
      final bytes = await ref.read(exportCalendarProvider(_selected))(
        calendar: widget.calendar,
        options: _options,
      );

      final delivery = ref.read(exportDeliveryProvider);
      if (_selected.isCopiedAsText) {
        await delivery.copyText(utf8.decode(bytes));
        if (mounted) _showCopied();
      } else {
        await delivery.shareFile(
          bytes: bytes,
          fileName: _selected.fileNameFor(
            username: widget.calendar.username,
            year: widget.calendar.year,
          ),
          mimeType: _selected.mimeType,
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() => _exportError = FailureMessage.ofAny(error));
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return AppSheet(
      title: const Text('Export'),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ExportPreview(
            calendar: widget.calendar,
            palette: widget.palette,
            cellShape: widget.cellShape,
            cellSize: widget.cellSize,
            filename: _selected.previewNameFor(widget.calendar.username),
            colors: colors,
          ),
          const SizedBox(height: Tokens.space4),
          for (final fmt in ExportFormat.values)
            Padding(
              padding: const EdgeInsets.only(bottom: Tokens.space2),
              child: _FormatTile(
                fmt: fmt,
                cellSize: widget.cellSize,
                weeks: widget.calendar.weeks.length,
                isSelected: fmt == _selected,
                colors: colors,
                onTap: () => setState(() => _selected = fmt),
              ),
            ),
          if (_exportError case final error?) ...[
            const SizedBox(height: Tokens.space2),
            Text(
              error,
              style: AppTextStyles.mono(
                fontSize: Tokens.textSm,
                color: colors.destructive,
              ),
            ),
          ],
          const SizedBox(height: Tokens.space2),
          Row(
            spacing: Tokens.space2,
            children: [
              Expanded(
                child: AppButton(
                  onPressed: _exporting ? null : _save,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_actionIcon, size: Tokens.iconSm),
                      const SizedBox(width: Tokens.space2),
                      Text(_actionLabel),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ExportPreview extends StatelessWidget {
  const _ExportPreview({
    required this.calendar,
    required this.palette,
    required this.cellShape,
    required this.cellSize,
    required this.filename,
    required this.colors,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape cellShape;
  final CellSize cellSize;
  final String filename;
  final AppColors colors;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        border: Border.all(color: colors.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        child: Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _CheckerPainter(
                  color1: colors.muted,
                  color2: colors.card,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: Tokens.space8),
              child: ContributionGrid(
                calendar: calendar,
                palette: palette,
                shape: cellShape,
                cellSize: cellSize,
              ),
            ),
            Positioned(
              top: Tokens.space2,
              right: Tokens.space2,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: colors.background.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(Tokens.radiusFull),
                  border: Border.all(color: colors.border),
                ),
                child: Padding(
                  padding: Tokens.filenamePadding,
                  child: Text(
                    filename,
                    style: AppTextStyles.mono(
                      fontSize: Tokens.textXs,
                      color: colors.mutedForeground,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckerPainter extends CustomPainter {
  const _CheckerPainter({required this.color1, required this.color2});

  final Color color1;
  final Color color2;

  static const _step = 12.0;

  @override
  void paint(Canvas canvas, Size size) {
    final p1 = Paint()..color = color1;
    final p2 = Paint()..color = color2;
    final rows = (size.height / _step).ceil() + 1;
    final cols = (size.width / _step).ceil() + 1;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        canvas.drawRect(
          Rect.fromLTWH(c * _step, r * _step, _step, _step),
          (r + c).isEven ? p1 : p2,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_CheckerPainter old) =>
      old.color1 != color1 || old.color2 != color2;
}

class _FormatTile extends StatelessWidget {
  const _FormatTile({
    required this.fmt,
    required this.cellSize,
    required this.weeks,
    required this.isSelected,
    required this.colors,
    required this.onTap,
  });

  final ExportFormat fmt;
  final CellSize cellSize;
  final int weeks;
  final bool isSelected;
  final AppColors colors;
  final VoidCallback onTap;

  String get _detail => switch (fmt) {
    ExportFormat.png => _pngDetail,
    ExportFormat.svg => 'Vector · scales to any size',
    ExportFormat.markdown => 'README embed snippet',
  };

  String get _pngDetail {
    final pixels = ExportGeometryService.pngPixelSizeFor(
      cellSize: cellSize,
      weeks: weeks,
    );
    return '${pixels.width}×${pixels.height} · transparent';
  }

  @override
  Widget build(BuildContext context) {
    final accent = colors.accent;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: Tokens.durationFast,
        padding: const EdgeInsets.symmetric(
          horizontal: Tokens.space4,
          vertical: Tokens.space4,
        ),
        decoration: BoxDecoration(
          color: isSelected ? colors.muted : colors.card,
          borderRadius: BorderRadius.circular(Tokens.radiusMd),
          border: Border.all(
            color: isSelected ? accent.withValues(alpha: 0.5) : colors.border,
            width: isSelected
                ? Tokens.tileBorderEmphasis
                : Tokens.tileBorderDefault,
          ),
        ),
        child: Row(
          children: [
            _FmtIcon(
              fmt: fmt,
              isSelected: isSelected,
              accent: accent,
              colors: colors,
            ),
            const SizedBox(width: Tokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(
                        '.${fmt.suffix}',
                        style: AppTextStyles.mono(
                          fontSize: Tokens.textSm,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? accent : colors.mutedForeground,
                        ),
                      ),
                      const SizedBox(width: Tokens.space2),
                      Text(
                        fmt.label,
                        style: TextStyle(
                          fontSize: Tokens.textBase,
                          fontWeight: FontWeight.w600,
                          color: colors.foreground,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: Tokens.hairlineGap),
                  Text(
                    _detail,
                    style: TextStyle(
                      fontSize: Tokens.textXs,
                      color: colors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FmtIcon extends StatelessWidget {
  const _FmtIcon({
    required this.fmt,
    required this.isSelected,
    required this.accent,
    required this.colors,
  });

  final ExportFormat fmt;
  final bool isSelected;
  final Color accent;
  final AppColors colors;

  @override
  Widget build(BuildContext context) {
    final iconColor = isSelected ? accent : colors.mutedForeground;
    final bgColor = isSelected ? accent.withValues(alpha: 0.1) : colors.muted;
    final borderColor = isSelected
        ? accent.withValues(alpha: 0.4)
        : colors.border;

    return Container(
      width: Tokens.formatTileSize,
      height: Tokens.formatTileSize,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(Tokens.radiusMd),
        border: Border.all(color: borderColor),
      ),
      child: Center(
        child: switch (fmt) {
          ExportFormat.png => Icon(
            LucideIcons.image,
            size: Tokens.iconLg,
            color: iconColor,
          ),
          ExportFormat.svg => Icon(
            LucideIcons.penLine,
            size: Tokens.iconLg,
            color: iconColor,
          ),
          ExportFormat.markdown => Text(
            'M↓',
            style: AppTextStyles.mono(
              fontSize: Tokens.textSm,
              fontWeight: FontWeight.w700,
              color: iconColor,
            ),
          ),
        },
      ),
    );
  }
}
