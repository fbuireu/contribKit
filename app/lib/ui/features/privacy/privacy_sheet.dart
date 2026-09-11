import 'package:contribkit/ui/features/privacy/telemetry_consent_notifier.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:contribkit/ui/widgets/app_switch.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class PrivacySheet extends ConsumerWidget {
  const PrivacySheet({super.key});

  static Future<void> show(BuildContext context) => AppSheet.showBottom(
    context: context,
    builder: (_) => const PrivacySheet(),
  );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = AppColors.of(context);
    final consent = ref.watch(telemetryConsentProvider);
    final notifier = ref.read(telemetryConsentProvider.notifier);

    return AppSheet(
      title: const Text('Privacy'),
      description: const Text(
        'ContribKit never sends the username you look up, the calendar you '
        'render, or anything you type. You can change these at any time.',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          _ConsentRow(
            title: 'Crash reports',
            description:
                'Sends the type of an error and where in the code it happened, '
                'never its message. Helps fix defects you would otherwise have '
                'to report by hand.',
            granted: consent.mayReportDiagnostics,
            onChanged: (granted) =>
                notifier.setDiagnosticReports(granted: granted),
          ),
          const SizedBox(height: Tokens.space5),
          _ConsentRow(
            title: 'Usage events',
            description:
                'Sends the name of a screen or action you reached, and nothing '
                'else: no properties, no identifiers, no calendar data.',
            granted: consent.mayRecordUsageEvents,
            onChanged: (granted) => notifier.setUsageEvents(granted: granted),
          ),
          const SizedBox(height: Tokens.space6),
          Row(
            children: [
              Expanded(
                child: AppButton.outline(
                  onPressed: () {
                    notifier.rejectAll();
                    Navigator.of(context).pop();
                  },
                  child: const Text('Reject all'),
                ),
              ),
              const SizedBox(width: Tokens.space3),
              Expanded(
                child: AppButton(
                  onPressed: () {
                    notifier.acceptAll();
                    Navigator.of(context).pop();
                  },
                  child: const Text('Accept all'),
                ),
              ),
            ],
          ),
          const SizedBox(height: Tokens.space4),
          Text(
            'Both are processed in the European Union. Full policy at '
            'contribkit.app/privacy.',
            style: TextStyle(
              fontSize: Tokens.textXs,
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _ConsentRow extends StatelessWidget {
  const _ConsentRow({
    required this.title,
    required this.description,
    required this.granted,
    required this.onChanged,
  });

  final String title;
  final String description;
  final bool granted;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: Tokens.textSm,
                  fontWeight: FontWeight.w600,
                  color: colors.foreground,
                ),
              ),
              const SizedBox(height: Tokens.space1),
              Text(
                description,
                style: TextStyle(
                  fontSize: Tokens.textXs,
                  color: colors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: Tokens.space4),
        AppSwitch(value: granted, onChanged: onChanged, semanticLabel: title),
      ],
    );
  }
}
