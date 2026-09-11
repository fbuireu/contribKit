import 'package:contribkit/domain/value_objects/usage_event.dart';

abstract interface class UsageEventRepository {
  Future<void> start();

  Future<void> record(UsageEvent event);

  Future<void> applyConsent({required bool granted});
}
