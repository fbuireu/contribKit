import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/infrastructure/export/png_export_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

RenderOptions _options({
  CellShape shape = CellShape.rounded,
  CellSize cellSize = CellSize.normal,
}) => RenderOptions(palette: testPalette, shape: shape, namedSize: cellSize);

Future<ui.Image> _decode(List<int> bytes) async {
  final codec = await ui.instantiateImageCodec(Uint8List.fromList(bytes));
  final frame = await codec.getNextFrame();
  return frame.image;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PngExportRepository', () {
    test('emits a real PNG, by its signature', () async {
      final bytes = await PngExportRepository().export(
        calendar: testCalendar(weeks: 3),
        options: _options(),
      );

      expect(bytes.take(8), [
        0x89,
        0x50,
        0x4E,
        0x47,
        0x0D,
        0x0A,
        0x1A,
        0x0A,
      ], reason: 'the first eight bytes of every PNG');
    });

    test(
      'is exactly the size the geometry service promised the sheet',
      () async {
        for (final cellSize in CellSize.values) {
          final bytes = await PngExportRepository().export(
            calendar: testCalendar(weeks: 4),
            options: _options(cellSize: cellSize),
          );
          final image = await _decode(bytes);
          addTearDown(image.dispose);

          final expected = ExportGeometryService.pngPixelSizeFor(
            cellSize: cellSize,
            weeks: 4,
          );

          expect(image.width, expected.width, reason: cellSize.name);
          expect(image.height, expected.height, reason: cellSize.name);
        }
      },
    );

    test(
      'renders every Cell Shape without falling back to one of them',
      () async {
        final rendered = <CellShape, List<int>>{};

        for (final shape in CellShape.values) {
          rendered[shape] = await PngExportRepository().export(
            calendar: testCalendar(weeks: 2),
            options: _options(shape: shape),
          );
        }

        for (final shape in CellShape.values) {
          expect(rendered[shape], isNotEmpty, reason: shape.name);
        }
        expect(
          rendered[CellShape.square],
          isNot(rendered[CellShape.circle]),
          reason: 'a square and a circle cannot encode to the same bytes',
        );
        expect(rendered[CellShape.hex], isNot(rendered[CellShape.square]));
      },
    );

    test('a calendar with no weeks is a refusal, not an empty image', () async {
      expect(
        () => PngExportRepository().export(
          calendar: testCalendar(weeks: 0),
          options: _options(),
        ),
        throwsA(isA<ExportFailure>()),
      );
    });

    test('grows with the calendar, one week at a time', () async {
      final narrow = await _decode(
        await PngExportRepository().export(
          calendar: testCalendar(weeks: 2),
          options: _options(),
        ),
      );
      addTearDown(narrow.dispose);

      final wide = await _decode(
        await PngExportRepository().export(
          calendar: testCalendar(weeks: 10),
          options: _options(),
        ),
      );
      addTearDown(wide.dispose);

      expect(wide.width, greaterThan(narrow.width));
      expect(
        wide.height,
        narrow.height,
        reason: 'a week is seven days whatever the year does',
      );
    });
  });
}
