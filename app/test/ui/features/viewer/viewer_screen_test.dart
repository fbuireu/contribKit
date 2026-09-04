import 'dart:async';

import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/value_objects/app_settings.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:contribkit/domain/value_objects/year.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/viewer/viewer_screen.dart';
import 'package:contribkit/ui/features/viewer/widgets/contribution_grid.dart';
import 'package:contribkit/ui/features/viewer/widgets/stats_panel.dart';
import 'package:contribkit/ui/widgets/app_text_field.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../support/fakes.dart';
import '../../../support/fixtures.dart';
import '../../../support/harness.dart';

Future<void> _pumpViewer(
  WidgetTester tester, {
  List<Override>? overrides,
  bool settle = true,
}) async {
  await tester.binding.setSurfaceSize(const Size(800, 2400));
  addTearDown(() => tester.binding.setSurfaceSize(null));

  await tester.pumpWidget(
    host(overrides: overrides ?? appOverrides(), child: const ViewerScreen()),
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Future<void> _submit(WidgetTester tester, String name) async {
  await tester.enterText(find.byType(AppTextField), name);
  await tester.testTextInput.receiveAction(TextInputAction.done);
  await tester.pumpAndSettle();
}

void main() {
  group('ViewerScreen', () {
    testWidgets('asks for a username before it has one', (tester) async {
      await _pumpViewer(tester);

      expect(
        find.text('Your GitHub activity.\nYour aesthetic.'),
        findsOneWidget,
      );
      expect(find.byType(ContributionGrid), findsNothing);
      expect(find.byType(StatsPanel), findsNothing);
    });

    testWidgets('offers the suggested usernames it was given', (tester) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          usernames: FakeSuggestedUsernameRepository(
            names: const ['torvalds', 'sindresorhus'],
          ),
        ),
      );

      expect(find.text('try:'), findsOneWidget);
      expect(find.text('torvalds'), findsOneWidget);
      expect(find.text('sindresorhus'), findsOneWidget);
    });

    testWidgets(
      'says why the suggestions are missing rather than hiding them',
      (tester) async {
        const failure = AssetFailure(asset: 'assets/usernames.json');

        await _pumpViewer(
          tester,
          overrides: appOverrides(
            usernames: FakeSuggestedUsernameRepository(failure: failure),
          ),
        );

        expect(find.text(FailureMessage.of(failure)), findsOneWidget);
      },
    );

    testWidgets('tapping a suggestion fetches that calendar', (tester) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          usernames: FakeSuggestedUsernameRepository(names: const ['torvalds']),
          contributions: FakeContributionRepository(
            answer: testCalendar(username: 'torvalds', weeks: 3),
          ),
        ),
      );

      await tester.tap(find.text('torvalds'));
      await tester.pumpAndSettle();

      expect(find.byType(ContributionGrid), findsOneWidget);
      expect(find.byType(StatsPanel), findsOneWidget);
    });

    testWidgets('a submitted username brings back a calendar and its stats', (
      tester,
    ) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          contributions: FakeContributionRepository(
            answer: testCalendar(weeks: 4, totalContributions: 1234),
          ),
        ),
      );

      await _submit(tester, 'octocat');

      expect(find.byType(ContributionGrid), findsOneWidget);
      expect(find.text('1,234 contributions'), findsOneWidget);
      expect(find.text('Customize'), findsOneWidget);
      expect(find.text('Export'), findsOneWidget);
    });

    testWidgets('a username GitHub would refuse never reaches the network', (
      tester,
    ) async {
      final contributions = FakeContributionRepository();

      await _pumpViewer(
        tester,
        overrides: appOverrides(contributions: contributions),
      );

      await _submit(tester, 'not a username');

      expect(find.byType(ContributionGrid), findsNothing);
      expect(
        find.textContaining('may only contain alphanumeric characters'),
        findsOneWidget,
      );
      expect(
        contributions.fetches,
        0,
        reason: 'the Username value object rejected it before any fetch',
      );
    });

    testWidgets('an empty submission does nothing at all', (tester) async {
      await _pumpViewer(tester);

      await _submit(tester, '   ');

      expect(find.byType(ContributionGrid), findsNothing);
      expect(
        find.text('Your GitHub activity.\nYour aesthetic.'),
        findsOneWidget,
      );
    });

    testWidgets('a failed fetch says why and offers to try again', (
      tester,
    ) async {
      final failure = NotFoundFailure(username: Username('octocat'));

      await _pumpViewer(
        tester,
        overrides: appOverrides(
          contributions: FakeContributionRepository(failure: failure),
        ),
      );

      await _submit(tester, 'octocat');

      expect(find.text(FailureMessage.of(failure)), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('Try again asks again, and shows what came back', (
      tester,
    ) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          contributions: FakeContributionRepository(
            answer: testCalendar(weeks: 3),
            failFetchesBefore: 1,
          ),
        ),
      );
      await _submit(tester, 'octocat');
      expect(find.text('Try again'), findsOneWidget);

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(find.byType(ContributionGrid), findsOneWidget);
    });

    testWidgets('marks a calendar that came from the cache', (tester) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          contributions: FakeContributionRepository(
            answer: testCalendar(weeks: 3),
            fromCache: true,
          ),
        ),
      );

      await _submit(tester, 'octocat');

      expect(find.text('cached'), findsOneWidget);
    });

    testWidgets('refreshing drops the cached entry before asking again', (
      tester,
    ) async {
      final contributions = FakeContributionRepository(
        answer: testCalendar(weeks: 3),
        fromCache: true,
      );

      await _pumpViewer(
        tester,
        overrides: appOverrides(contributions: contributions),
      );
      await _submit(tester, 'octocat');

      await tester.tap(find.byIcon(LucideIcons.refreshCw));
      await tester.pumpAndSettle();

      expect(contributions.invalidated, [Username('octocat')]);
    });

    testWidgets('offers every year back to the first one GitHub has', (
      tester,
    ) async {
      await _pumpViewer(tester);

      final currentYear = DateTime.now().year;
      expect(find.text('$currentYear'), findsOneWidget);
      expect(find.text('${Year.minYear}'), findsOneWidget);
    });

    testWidgets('picking a year refetches that year for the same person', (
      tester,
    ) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          contributions: FakeContributionRepository(
            answer: testCalendar(weeks: 3),
          ),
        ),
      );
      await _submit(tester, 'octocat');

      await tester.tap(find.text('2020'));
      await tester.pumpAndSettle();

      expect(find.text('CONTRIBUTIONS · 2020'), findsOneWidget);
    });

    testWidgets('restores the username it remembered into the field', (
      tester,
    ) async {
      await _pumpViewer(
        tester,
        overrides: appOverrides(
          settings: FakeSettingsRepository(
            settings: AppSettings(
              lastUsername: Username('torvalds'),
              lastYear: Year(2024),
            ),
          ),
          contributions: FakeContributionRepository(
            answer: testCalendar(username: 'torvalds', weeks: 3),
          ),
        ),
      );

      final field = tester.widget<ShadInput>(find.byType(ShadInput));
      expect(field.controller?.text, 'torvalds');
      expect(find.byType(ContributionGrid), findsOneWidget);
    });

    testWidgets('the theme toggle swaps the icon it offers', (tester) async {
      await _pumpViewer(tester);

      expect(find.byIcon(LucideIcons.moon), findsOneWidget);

      await tester.tap(find.byIcon(LucideIcons.moon));
      await tester.pumpAndSettle();

      expect(find.byIcon(LucideIcons.sun), findsOneWidget);
      expect(find.byIcon(LucideIcons.moon), findsNothing);
    });

    testWidgets('shows nothing but the loader while it is still working', (
      tester,
    ) async {
      final gate = Completer<void>();

      await _pumpViewer(
        tester,
        settle: false,
        overrides: appOverrides(
          settings: FakeSettingsRepository(),
          palettes: FakePaletteRepository(gate: gate.future),
        ),
      );

      expect(find.text('Your GitHub activity.\nYour aesthetic.'), findsNothing);
      expect(find.byType(ContributionGrid), findsNothing);

      gate.complete();
      await tester.pumpAndSettle();
      expect(
        find.text('Your GitHub activity.\nYour aesthetic.'),
        findsOneWidget,
      );
    });
  });
}
