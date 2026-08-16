import 'dart:convert';

import 'package:contribkit/ui/widgets/app_icons.dart';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/export_format.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_card.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

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

const _panelOrder = [ExportFormat.svg, ExportFormat.png, ExportFormat.markdown];

const _sublabels = {
  ExportFormat.svg: 'vector',
  ExportFormat.png: 'image',
  ExportFormat.markdown: 'markdown',
};

class _ExportPanelState extends ConsumerState<ExportPanel> {
  bool _exporting = false;
  bool _copied = false;
  String? _exportError;

  RenderOptions get _options => RenderOptions(
    palette: widget.palette,
    shape: widget.cellShape,
    cellSize: widget.cellSize.pixels,
    gap: widget.cellSize.gap,
  );

  Future<void> _export(ExportFormat format) async {
    if (_exporting) return;
    setState(() {
      _exporting = true;
      _exportError = null;
    });

    try {
      final bytes = await ref.read(exportCalendarProvider(format))(
        calendar: widget.calendar,
        options: _options,
      );
      if (format.isCopiedAsText) {
        await Clipboard.setData(ClipboardData(text: utf8.decode(bytes)));
        if (mounted) {
          setState(() => _copied = true);
          Future.delayed(Tokens.durationCopiedFeedback, () {
            if (mounted) setState(() => _copied = false);
          });
        }
      } else {
        final xFile = XFile.fromData(
          Uint8List.fromList(bytes),
          name: format.fileNameFor(
            username: widget.calendar.username,
            year: widget.calendar.year,
          ),
          mimeType: format.mimeType,
        );
        await SharePlus.instance.share(ShareParams(files: [xFile]));
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
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: Tokens.space3,
        children: [
          Text(
            'Export',
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: AppColors.of(context).mutedForeground,
            ),
          ),
          if (_exportError != null)
            Text(
              _exportError!,
              style: TextStyle(
                fontSize: Tokens.textSm,
                color: AppColors.of(context).destructive,
              ),
            ),
          Row(
            spacing: Tokens.space2,
            children: [
              for (final format in _panelOrder)
                _ExportFormatButton(
                  label: format.label,
                  sublabel: _sublabels[format]!,
                  colors: colors,
                  disabled: _exporting,
                  onTap: () => _export(format),
                ),
              const Spacer(),
              AppButton.ghost(
                onPressed: _exporting
                    ? null
                    : () => _export(ExportFormat.markdown),
                size: AppButtonSize.sm,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: Tokens.space1,
                  children: [
                    Icon(
                      _copied ? LucideIcons.check : LucideIcons.copy,
                      size: Tokens.iconXs,
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
