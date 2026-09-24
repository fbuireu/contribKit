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
  }

  @override
  Future<void> copyText(String text) =>
      Clipboard.setData(ClipboardData(text: text));
}
