import 'dart:typed_data';

import 'package:contribkit/application/use_cases/export_calendar.dart';
import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/presentation/di/providers.dart';
import 'package:contribkit/presentation/theme/tokens.dart';
import 'package:contribkit/presentation/widgets/app_button.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

/// Bottom panel with export format buttons.
class ExportPanel extends ConsumerStatefulWidget {
  const ExportPanel({
    super.key,
    required this.calendar,
    required this.palette,
    required this.cellShape,
  });

  final ContributionCalendar calendar;
  final Palette palette;
  final CellShape cellShape;

  @override
  ConsumerState<ExportPanel> createState() => _ExportPanelState();
}

class _ExportPanelState extends ConsumerState<ExportPanel> {
  bool _exporting = false;

  RenderOptions get _options => RenderOptions(
        palette: widget.palette,
        shape: widget.cellShape,
      );

  Future<void> _export({
    required ExportCalendar useCase,
    required String filename,
    required String mimeType,
  }) async {
    if (_exporting) return;
    setState(() => _exporting = true);

    try {
      final bytes = await useCase(
        calendar: widget.calendar,
        options: _options,
      );
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

  @override
  Widget build(BuildContext context) {
    final svg = ref.read(svgExportCalendarProvider);
    final png = ref.read(pngExportCalendarProvider);
    final md = ref.read(markdownExportCalendarProvider);
    final user = widget.calendar.username.value;
    final year = widget.calendar.year.value;

    return Padding(
      padding: const EdgeInsets.all(Tokens.space4),
      child: Row(
        spacing: Tokens.space2,
        children: [
          AppButton.outline(
            onPressed: _exporting
                ? null
                : () => _export(
                      useCase: svg,
                      filename: '${user}_$year.svg',
                      mimeType: 'image/svg+xml',
                    ),
            child: const Text('SVG'),
          ),
          AppButton.outline(
            onPressed: _exporting
                ? null
                : () => _export(
                      useCase: png,
                      filename: '${user}_$year.png',
                      mimeType: 'image/png',
                    ),
            child: const Text('PNG'),
          ),
          AppButton.outline(
            onPressed: _exporting
                ? null
                : () => _export(
                      useCase: md,
                      filename: '${user}_$year.md',
                      mimeType: 'text/markdown',
                    ),
            child: const Text('Markdown'),
          ),
        ],
      ),
    );
  }
}
