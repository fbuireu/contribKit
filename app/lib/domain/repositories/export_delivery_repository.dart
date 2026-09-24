abstract interface class ExportDeliveryRepository {
  Future<bool> shareFile({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  });

  Future<void> copyText(String text);
}
