abstract interface class ExportDeliveryRepository {
  Future<void> shareFile({
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  });

  Future<void> copyText(String text);
}
