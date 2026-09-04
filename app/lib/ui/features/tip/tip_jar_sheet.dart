import 'package:contribkit/domain/value_objects/tip_outcome.dart';
import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/failure_message.dart';
import 'package:contribkit/ui/features/tip/tip_jar_state.dart';
import 'package:contribkit/ui/features/tip/tip_product_presentation.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:contribkit/ui/widgets/app_icons.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class TipJarSheet extends ConsumerStatefulWidget {
  const TipJarSheet({super.key});

  static Future<void> show(BuildContext context) => AppSheet.showBottom(
    context: context,
    builder: (_) => const TipJarSheet(),
  );

  @override
  ConsumerState<TipJarSheet> createState() => _TipJarSheetState();
}

class _TipJarSheetState extends ConsumerState<TipJarSheet> {
  TipJarState _state = const TipJarLoading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _to(TipJarState next) {
    if (mounted) setState(() => _state = next);
  }

  Future<void> _load() async {
    _to(const TipJarLoading());
    try {
      _to(TipJarReady.of(await ref.read(fetchTipProductsProvider).call()));
    } catch (e) {
      _to(TipJarUnavailable(message: FailureMessage.ofAny(e)));
    }
  }

  Future<void> _give(TipProduct product) async {
    final ready = _state;
    if (ready is! TipJarReady) return;
    final started = ready.beginning(product);
    if (started == null) return;
    _to(started);

    try {
      final outcome = await ref.read(giveTipProvider).call(product);
      _to(
        started.settling(
          outcome == TipOutcome.completed
              ? TipCompleted(product)
              : TipCancelled(product),
        ),
      );
    } catch (e) {
      _to(
        started.settling(
          TipFailed(product: product, message: FailureMessage.ofAny(e)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppSheet(
      title: const Text('Support ContribKit'),
      description: const Text(
        'ContribKit is free and open-source. A small tip helps keep it alive.',
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: Tokens.space3,
        children: _content(context),
      ),
    );
  }

  List<Widget> _content(BuildContext context) {
    final colors = AppColors.of(context);

    return switch (_state) {
      TipJarLoading() => List.generate(3, (_) => const _SkeletonTile()),
      TipJarUnavailable(:final message) => [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: Tokens.space6),
          child: Text(
            message ?? 'No tips are available on this device right now.',
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: message == null
                  ? colors.mutedForeground
                  : colors.destructive,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        AppButton.ghost(onPressed: _load, child: const Text('Retry')),
        AppButton.ghost(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text(
            'Maybe later',
            style: TextStyle(fontSize: Tokens.textSm),
          ),
        ),
      ],
      final TipJarReady ready => [
        for (final p in ready.products)
          _TierCard(
            product: p,
            look: TipProductPresentation.of(p),
            isGiving: ready.isInFlight(p),
            isGiven: ready.isCompleted(p),
            hasFailed: ready.hasFailed(p),
            disabled: ready.isBusy,
            colors: colors,
            onTap: () => _give(p),
          ),
        if (ready.failureMessage case final failure?)
          Padding(
            padding: const EdgeInsets.only(top: Tokens.space2),
            child: Text(
              failure,
              style: TextStyle(
                fontSize: Tokens.textSm,
                color: colors.destructive,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        const SizedBox(height: Tokens.space1),
        AppButton.ghost(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(
            ready.isThanking ? 'Thanks! ❤️' : 'Maybe later',
            style: const TextStyle(fontSize: Tokens.textSm),
          ),
        ),
      ],
    };
  }
}

class _TierCard extends StatelessWidget {
  const _TierCard({
    required this.product,
    required this.look,
    required this.isGiving,
    required this.isGiven,
    required this.hasFailed,
    required this.disabled,
    required this.colors,
    required this.onTap,
  });

  final TipProduct product;
  final TipProductLook look;
  final bool isGiving;
  final bool isGiven;
  final bool hasFailed;
  final bool disabled;
  final AppColors colors;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: Tokens.durationBase,
        padding: const EdgeInsets.symmetric(
          horizontal: Tokens.space4,
          vertical: Tokens.space4,
        ),
        decoration: BoxDecoration(
          color: isGiven ? colors.muted : colors.card,
          border: Border.all(
            color: hasFailed
                ? colors.destructive
                : isGiven
                ? colors.ring
                : colors.border,
            width: (isGiven || hasFailed)
                ? Tokens.tileBorderEmphasis
                : Tokens.tileBorderDefault,
          ),
          borderRadius: BorderRadius.circular(Tokens.radiusMd),
        ),
        child: Row(
          children: [
            Text(
              look.emoji,
              style: const TextStyle(fontSize: Tokens.emojiSize, height: 1),
            ),
            const SizedBox(width: Tokens.space2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    look.label,
                    style: TextStyle(
                      fontSize: Tokens.textBase,
                      fontWeight: FontWeight.w500,
                      color: colors.foreground,
                    ),
                  ),
                  Text(
                    product.priceString,
                    style: TextStyle(
                      fontSize: Tokens.textSm,
                      color: colors.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            if (isGiving)
              Icon(
                    LucideIcons.loader2,
                    size: Tokens.iconMd,
                    color: colors.mutedForeground,
                  )
                  .animate(onPlay: (c) => c.repeat())
                  .rotate(duration: Tokens.durationSpin, curve: Curves.linear)
            else if (isGiven)
              Icon(
                LucideIcons.check,
                size: Tokens.iconMd,
                color: colors.foreground,
              )
            else if (hasFailed)
              Icon(
                LucideIcons.alertCircle,
                size: Tokens.iconMd,
                color: colors.destructive,
              )
            else
              Icon(
                LucideIcons.chevronRight,
                size: Tokens.iconSm,
                color: colors.mutedForeground,
              ),
          ],
        ),
      ),
    );
  }
}

class _SkeletonTile extends StatelessWidget {
  const _SkeletonTile();

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
          height: Tokens.tipTileHeight,
          decoration: BoxDecoration(
            color: colors.muted,
            borderRadius: BorderRadius.circular(Tokens.radiusMd),
            border: Border.all(color: colors.border),
          ),
        )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .fade(
          begin: 0.4,
          end: 1.0,
          duration: Tokens.durationBreathe,
          curve: Curves.easeInOut,
        );
  }
}
