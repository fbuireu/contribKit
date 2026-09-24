import 'dart:async';

import 'package:contribkit/domain/value_objects/contact_message.dart';
import 'package:contribkit/domain/value_objects/contact_outcome.dart';
import 'package:contribkit/domain/value_objects/usage_event.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/contact/contact_sheet_state.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:contribkit/ui/widgets/app_text_field.dart';
import 'package:flutter/services.dart' show TextInputAction, TextInputType;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ContactSheet extends ConsumerStatefulWidget {
  const ContactSheet({super.key});

  static Future<void> show(BuildContext context) => AppSheet.showBottom(
    context: context,
    builder: (_) => const ContactSheet(),
  );

  @override
  ConsumerState<ContactSheet> createState() => _ContactSheetState();
}

class _ContactSheetState extends ConsumerState<ContactSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _messageController;

  ContactSheetState _state = const ContactIdle();
  String _inputError = '';

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _messageController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _to(ContactSheetState next) {
    if (mounted) setState(() => _state = next);
  }

  Future<void> _send() async {
    if (_state.isSending) return;

    final ContactMessage message;
    try {
      message = ContactMessage(
        name: _nameController.text,
        email: _emailController.text,
        body: _messageController.text,
      );
    } on ArgumentError catch (e) {
      setState(() => _inputError = e.message.toString());
      return;
    }

    setState(() {
      _inputError = '';
      _state = const ContactSending();
    });
    final usageEvents = ref.read(usageEventRepositoryProvider);

    try {
      await ref.read(sendContactMessageProvider).call(message);
      unawaited(
        usageEvents.record(
          UsageEvent.contactMessageSent(outcome: ContactOutcome.sent),
        ),
      );
      _to(const ContactSent());
    } catch (e) {
      unawaited(
        usageEvents.record(
          UsageEvent.contactMessageSent(outcome: ContactOutcome.failed),
        ),
      );
      _to(ContactFailed(message: FailureMessage.ofAny(e)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final sent = _state is ContactSent;

    return AppSheet(
      title: const Text('Contact'),
      description: const Text(
        'Write to the maintainer; it leaves as an email and is stored nowhere.',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        spacing: Tokens.space3,
        children: sent
            ? [
                Text(
                  'Thanks, your message is on its way.',
                  style: TextStyle(
                    fontSize: Tokens.textSm,
                    color: colors.foreground,
                  ),
                  textAlign: TextAlign.center,
                ),
                AppButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Close'),
                ),
              ]
            : [
                AppTextField(
                  controller: _nameController,
                  placeholder: 'Name (optional)',
                  enabled: !_state.isSending,
                  textInputAction: TextInputAction.next,
                ),
                AppTextField(
                  controller: _emailController,
                  placeholder: 'Email',
                  enabled: !_state.isSending,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                ),
                AppTextField(
                  controller: _messageController,
                  placeholder: 'Message',
                  enabled: !_state.isSending,
                  minLines: 4,
                  maxLines: 8,
                  keyboardType: TextInputType.multiline,
                ),
                if (_inputError.isNotEmpty)
                  Text(
                    _inputError,
                    style: TextStyle(
                      fontSize: Tokens.textSm,
                      color: colors.destructive,
                    ),
                  ),
                if (_state.failureMessage case final failure?)
                  Text(
                    failure,
                    style: TextStyle(
                      fontSize: Tokens.textSm,
                      color: colors.destructive,
                    ),
                    textAlign: TextAlign.center,
                  ),
                AppButton(
                  onPressed: _send,
                  enabled: !_state.isSending,
                  child: Text(_state.isSending ? 'Sending…' : 'Send'),
                ),
                AppButton.ghost(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(fontSize: Tokens.textSm),
                  ),
                ),
              ],
      ),
    );
  }
}
