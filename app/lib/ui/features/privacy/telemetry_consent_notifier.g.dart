// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'telemetry_consent_notifier.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(TelemetryConsentNotifier)
final telemetryConsentProvider = TelemetryConsentNotifierProvider._();

final class TelemetryConsentNotifierProvider
    extends $NotifierProvider<TelemetryConsentNotifier, TelemetryConsent> {
  TelemetryConsentNotifierProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'telemetryConsentProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$telemetryConsentNotifierHash();

  @$internal
  @override
  TelemetryConsentNotifier create() => TelemetryConsentNotifier();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TelemetryConsent value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TelemetryConsent>(value),
    );
  }
}

String _$telemetryConsentNotifierHash() =>
    r'f5953fc32af6ae6da0b90130b5a9b44d4958a218';

abstract class _$TelemetryConsentNotifier extends $Notifier<TelemetryConsent> {
  TelemetryConsent build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<TelemetryConsent, TelemetryConsent>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<TelemetryConsent, TelemetryConsent>,
              TelemetryConsent,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
