import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/services/cell_geometry_service.dart';
import 'package:contribkit/domain/services/contribution_grid_service.dart';
import 'package:contribkit/domain/services/export_geometry_service.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/cell_size.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/export/svg_export_repository_impl.dart';
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

ContributionCalendar _calendar({
  ContributionLevel level = ContributionLevel.none,
  int? count,
  String username = 'octocat',
}) {
  final grid = ContributionGridService.buildFor(days: const [], year: 2024);
  final weeks = grid
      .map(
        (week) => ContributionWeek(
          days: week.days
              .map(
                (day) =>
                    ContributionDay(date: day.date, count: count, level: level),
              )
              .toList(),
        ),
      )
      .toList();

  return ContributionCalendar(
    username: Username(username),
    year: Year(2024),
    weeks: weeks,
    totalContributions: count,
  );
}

const _options = RenderOptions(palette: _palette, shape: CellShape.rounded);

Future<String> _render({
  RenderOptions options = _options,
  ContributionCalendar? calendar,
}) async {
  final bytes = await SvgExportRepository().export(
    calendar: calendar ?? _calendar(),
    options: options,
  );
  return utf8.decode(bytes);
}

void main() {
  group('SvgExportRepository', () {
    test('emits a well-formed SVG document', () async {
      final svg = await _render();

      expect(svg, startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      expect(svg, contains('xmlns="http://www.w3.org/2000/svg"'));
      expect(svg.trimRight(), endsWith('</svg>'));
    });

    test('sizes the document with ExportGeometryService, not a second formula', () async {
      final svg = await _render();
      final size = ExportGeometryService.logicalSizeFor(
        cellSize: CellSize.fallback,
        weeks: ContributionGridService.weeksFor(2024),
      );

      expect(svg, contains('width="${size.width.toStringAsFixed(1)}"'));
      expect(svg, contains('height="${size.height.toStringAsFixed(1)}"'));
      expect(
        svg,
        contains(
          'viewBox="0 0 ${size.width.toStringAsFixed(1)} ${size.height.toStringAsFixed(1)}"',
        ),
      );
    });

    test(
      'takes every dimension from ExportGeometryService, at every Cell Size',
      () async {
        for (final cellSize in CellSize.values) {
          final svg = await _render(
            options: RenderOptions(
              palette: _palette,
              shape: CellShape.rounded,
              namedSize: cellSize,
            ),
          );
          final logical = ExportGeometryService.logicalSizeFor(
            cellSize: cellSize,
            weeks: ContributionGridService.weeksFor(2024),
          );

          expect(
            svg,
            contains('width="${logical.width.toStringAsFixed(1)}"'),
            reason: 'the SVG Export must not re-derive its own document size',
          );
          expect(
            svg,
            contains('height="${logical.height.toStringAsFixed(1)}"'),
            reason:
                'both dimensions follow the service at every Cell Size. The '
                'literal 7 it replaced is not itself testable, because '
                'daysPerWeek is 7',
          );
        }
      },
    );

    test('titles the document with the username and the Year', () async {
      final svg = await _render(calendar: _calendar(username: 'torvalds'));

      expect(
        svg,
        contains('<title>torvalds GitHub contributions 2024</title>'),
      );
    });

    test('draws one Cell per Contribution Day of the whole grid', () async {
      final svg = await _render();
      final cells = RegExp('<rect ').allMatches(svg).length;

      expect(
        cells,
        ContributionGridService.weeksFor(2024) *
            ContributionGridService.daysPerWeek,
      );
    });

    test('names an unknown Count rather than calling it zero', () async {
      final svg = await _render(calendar: _calendar(count: null));

      expect(svg, contains('2024-06-15: unknown'));
      expect(svg, isNot(contains('2024-06-15: 0')));
    });

    test('states a known Count', () async {
      final svg = await _render(
        calendar: _calendar(level: ContributionLevel.high, count: 7),
      );

      expect(svg, contains('2024-06-15: 7'));
    });

    test(
      'paints with the dark Palette, so noneLight never reaches an Export',
      () async {
        final svg = await _render(calendar: _calendar());

        expect(svg, contains(_palette.none.toHex()));
        expect(svg, isNot(contains(_palette.noneLight.toHex())));
      },
    );

    test(
      'rounds a corner with the shared Cell geometry, not its own number',
      () async {
        final svg = await _render();
        final radius = CellGeometryService.cornerRadiusFor(11.0);

        expect(svg, contains('rx="${radius.toStringAsFixed(1)}"'));
      },
    );

    test('draws every Cell Shape it is asked for', () async {
      Future<String> withShape(CellShape shape) => _render(
        options: RenderOptions(palette: _palette, shape: shape),
      );

      expect(await withShape(CellShape.square), contains('<rect '));
      expect(await withShape(CellShape.rounded), contains('rx='));
      expect(await withShape(CellShape.circle), contains('<circle '));
      expect(await withShape(CellShape.dot), contains('<circle '));
      expect(await withShape(CellShape.hex), contains('<polygon points='));
    });

    test(
      'scales a dot with the Cell Size, through the shared geometry',
      () async {
        final svg = await _render(
          options: const RenderOptions(
            palette: _palette,
            shape: CellShape.dot,
            namedSize: CellSize.large,
          ),
          calendar: _calendar(level: ContributionLevel.veryHigh, count: 1),
        );
        final radius = CellGeometryService.dotRadiusFor(
          levelIndex: ContributionLevel.veryHigh.index,
          cellSize: CellSize.large.pixels,
        );

        expect(svg, contains('r="${radius.toStringAsFixed(2)}"'));
      },
    );

    test('gives a hex six vertices', () async {
      final svg = await _render(
        options: const RenderOptions(palette: _palette, shape: CellShape.hex),
      );
      final points = RegExp('<polygon points="([^"]+)"').firstMatch(svg)!;

      expect(points.group(1)!.split(' '), hasLength(6));
    });
  });
}
