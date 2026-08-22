import 'dart:convert';

import 'package:contribkit/domain/entities/contribution_calendar.dart';
import 'package:contribkit/domain/entities/contribution_day.dart';
import 'package:contribkit/domain/entities/contribution_week.dart';
import 'package:contribkit/domain/repositories/export_repository.dart';
import 'package:contribkit/domain/value_objects/cell_shape.dart';
import 'package:contribkit/domain/value_objects/color.dart';
import 'package:contribkit/domain/value_objects/contribution_level.dart';
import 'package:contribkit/domain/value_objects/palette.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/infrastructure/export/markdown_export_repository_impl.dart';
import 'package:flutter_test/flutter_test.dart';

const _github = Palette(
  key: 'github',
  name: 'GitHub',
  none: Color(0xFF161B22),
  noneLight: Color(0xFFEBEDF0),
  low: Color(0xFF0E4429),
  medium: Color(0xFF006D32),
  high: Color(0xFF26A641),
  veryHigh: Color(0xFF39D353),
);

const _nord = Palette(
  key: 'nord',
  name: 'Nord',
  none: Color(0xFF2E3440),
  noneLight: Color(0xFFECEFF4),
  low: Color(0xFF3B4252),
  medium: Color(0xFF434C5E),
  high: Color(0xFF4C566A),
  veryHigh: Color(0xFF88C0D0),
);

ContributionCalendar _calendar() => ContributionCalendar(
  username: Username('octocat'),
  year: Year(2023),
  weeks: [
    ContributionWeek(
      days: [
        ContributionDay(
          date: DateTime(2023, 6, 1),
          count: 3,
          level: ContributionLevel.medium,
        ),
      ],
    ),
  ],
  totalContributions: 3,
);

Future<String> _render(RenderOptions options) async => utf8.decode(
  await const MarkdownExportRepository().export(
    calendar: _calendar(),
    options: options,
  ),
);

void main() {
  group('MarkdownExportRepository', () {
    test('points at the live Embed, not at a base64 data URI', () async {
      final markdown = await _render(
        const RenderOptions(palette: _github, shape: CellShape.rounded),
      );

      expect(markdown, contains('https://contribkit.app/user/octocat.svg'));
      expect(
        markdown,
        isNot(contains('data:image/svg+xml')),
        reason: 'GitHub does not render a data URI in Markdown',
      );
      expect(markdown, isNot(contains('base64')));
    });

    test(
      'is a Markdown image with the calendar named in its alt text',
      () async {
        final markdown = await _render(
          const RenderOptions(palette: _github, shape: CellShape.rounded),
        );

        expect(markdown, startsWith('!['));
        expect(markdown, contains('octocat GitHub contributions'));
        expect(markdown, endsWith(')\n'));
      },
    );

    test(
      'omits a Palette and a Cell Shape that are already the default',
      () async {
        final markdown = await _render(
          const RenderOptions(palette: _github, shape: CellShape.rounded),
        );

        expect(markdown, isNot(contains('?')));
      },
    );

    test(
      'carries a non-default Palette and Cell Shape as query params',
      () async {
        final markdown = await _render(
          const RenderOptions(palette: _nord, shape: CellShape.hex),
        );

        expect(markdown, contains('palette=nord'));
        expect(markdown, contains('shape=hex'));
      },
    );

    test('names no Year anywhere, because the Embed endpoint ignores one', () async {
      final markdown = await _render(
        const RenderOptions(palette: _github, shape: CellShape.rounded),
      );
      final url = RegExp(r'\((https://[^)]+)\)')
          .firstMatch(markdown)!
          .group(1)!;

      expect(url, isNot(contains('2023')));
      expect(url, isNot(contains('year')));
      expect(
        markdown,
        isNot(contains('2023')),
        reason:
            'the alt text used to assert a Year the rolling Embed never shows',
      );
    });
  });
}
