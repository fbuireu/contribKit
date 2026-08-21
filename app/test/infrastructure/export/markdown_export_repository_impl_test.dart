import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/export/markdown_export_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';

const _palette = Palette(
  key: 'test',
  name: 'Test',
  none: Color(0xFF101010),
  noneLight: Color(0xFFFAFAFA),
  low: Color(0xFF202020),
  medium: Color(0xFF303030),
  high: Color(0xFF404040),
  veryHigh: Color(0xFF505050),
);

const _options = RenderOptions(palette: _palette, shape: CellShape.rounded);

final _calendar = ContributionCalendar(
  username: Username('octocat'),
  year: Year(2024),
  weeks: const [],
  totalContributions: 0,
);

final class _StubSvgRepository implements ExportRepository {
  _StubSvgRepository(this._svg);

  final String _svg;
  var calls = 0;

  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async {
    calls++;
    return utf8.encode(_svg);
  }
}

final class _ThrowingRepository implements ExportRepository {
  _ThrowingRepository(this._error);

  final Object _error;

  @override
  Future<List<int>> export({
    required ContributionCalendar calendar,
    required RenderOptions options,
  }) async => throw _error;
}

Future<String> _render(ExportRepository svg) async {
  final bytes = await MarkdownExportRepository(svgRepository: svg)
      .export(calendar: _calendar, options: _options);
  return utf8.decode(bytes);
}

void main() {
  group('MarkdownExportRepository', () {
    test('embeds the SVG as a base64 data URI', () async {
      final markdown = await _render(_StubSvgRepository('<svg/>'));
      final encoded = base64Encode(utf8.encode('<svg/>'));

      expect(markdown, contains('data:image/svg+xml;base64,$encoded'));
    });

    test('is a Markdown image, one line', () async {
      final markdown = await _render(_StubSvgRepository('<svg/>'));

      expect(markdown, startsWith('!['));
      expect(markdown, endsWith('\n'));
      expect(markdown.trim().split('\n'), hasLength(1));
    });

    test('describes the image with the username and the Year', () async {
      final markdown = await _render(_StubSvgRepository('<svg/>'));

      expect(markdown, contains('octocat GitHub contributions 2024'));
    });

    test('composes the SVG repository rather than rendering its own', () async {
      final svg = _StubSvgRepository('<svg/>');
      await _render(svg);

      expect(svg.calls, 1);
    });

    test('passes an ExportFailure through with its own message', () async {
      final repository = _ThrowingRepository(
        const ExportFailure(message: 'SVG render failed: boom'),
      );

      await expectLater(
        _render(repository),
        throwsA(
          isA<ExportFailure>().having(
            (f) => f.message,
            'message',
            'SVG render failed: boom',
          ),
        ),
      );
    });

    test('converts anything else into an ExportFailure', () async {
      final repository = _ThrowingRepository(StateError('no element'));

      await expectLater(
        _render(repository),
        throwsA(
          isA<ExportFailure>().having(
            (f) => f.message,
            'message',
            contains('Markdown export failed'),
          ),
        ),
      );
    });
  });
}
