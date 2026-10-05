import 'package:contribkit/domain/failures/failure.dart';

abstract final class RequestTimeout {
  static const duration = Duration(seconds: 20);

  static Never expired() => throw NetworkFailure(
    message: 'Request timed out after ${duration.inSeconds}s',
  );
}
