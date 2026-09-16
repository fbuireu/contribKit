import 'package:contribkit/domain/value_objects/contact_message.dart';

abstract interface class ContactMessageRepository {
  Future<void> deliver(ContactMessage message);
}
