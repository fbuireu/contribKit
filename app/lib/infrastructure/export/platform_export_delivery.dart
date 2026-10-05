import 'package:contribkit/domain/failures/failure.dart';
import 'package:contribkit/domain/repositories/export_delivery_repository.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

final class PlatformExportDelivery implements ExportDeliveryRepository {
  const PlatformExportDelivery();

  @override
  Future<bool> shareFile({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  }) async {
    try {
      final result = await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile.fromData(
              Uint8List.fromList(bytes),
              name: fileName,
              mimeType: mimeType,
            ),
          ],
          fileNameOverrides: [fileName],
        ),
      );
      return result.status != ShareResultStatus.dismissed;
    } catch (e) {
      throw ExportFailure(message: 'Share failed: $e');
    }
  }

  @override
  Future<void> copyText(String text) async {
    try {
      await Clipboard.setData(ClipboardData(text: text));
    } catch (e) {
      throw ExportFailure(message: 'Copy failed: $e');
    }
  }
}
