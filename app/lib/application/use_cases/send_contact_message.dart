import 'package:contribkit/domain/repositories/contact_message_repository.dart';
import 'package:contribkit/domain/value_objects/contact_message.dart';

final class SendContactMessage {
  const SendContactMessage({required this.repository});

  final ContactMessageRepository repository;

  Future<void> call(ContactMessage message) => repository.deliver(message);
}
