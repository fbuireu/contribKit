import 'package:contribkit/domain/repositories/contact_message_repository.dart';
import 'package:contribkit/domain/value_objects/contact_message.dart';

final class SendContactMessage {
  const SendContactMessage({required this._repository});

  final ContactMessageRepository _repository;

  Future<void> call(ContactMessage message) => _repository.deliver(message);
}
