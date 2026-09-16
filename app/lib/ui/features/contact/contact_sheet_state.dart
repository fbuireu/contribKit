sealed class ContactSheetState {
  const ContactSheetState();

  bool get isSending => this is ContactSending;

  String? get failureMessage => switch (this) {
    ContactFailed(:final message) => message,
    _ => null,
  };
}

final class ContactIdle extends ContactSheetState {
  const ContactIdle();
}

final class ContactSending extends ContactSheetState {
  const ContactSending();
}

final class ContactSent extends ContactSheetState {
  const ContactSent();
}

final class ContactFailed extends ContactSheetState {
  const ContactFailed({required this.message});
  final String message;
}
