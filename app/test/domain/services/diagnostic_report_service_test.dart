import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/services/diagnostic_report_service.dart';
import 'package:contribkit/domain/value_objects/username.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DiagnosticReportService.warrants', () {
    test('is false for the failures the world causes', () {
      final worldly = <Failure>[
        const NetworkFailure(message: 'Connection refused'),
        RateLimitedFailure(resetAt: DateTime(2026)),
        NotFoundFailure(username: Username('octocat')),
      ];

      expect(
        worldly.map(DiagnosticReportService.warrants),
        everyElement(isFalse),
      );
    });

    test('is true for the failures only the code can cause', () {
      const defects = <Failure>[
        ParseFailure(message: 'Could not parse contributions'),
        AssetFailure(asset: 'assets/palettes.json'),
        CacheFailure(message: 'box corrupted'),
        ExportFailure(message: 'render'),
        TipFailure(message: 'store'),
        UnexpectedFailure(message: 'boom'),
      ];

      expect(
        defects.map(DiagnosticReportService.warrants),
        everyElement(isTrue),
      );
    });
  });
}
