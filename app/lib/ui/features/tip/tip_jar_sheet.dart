import 'package:contribkit/domain/value_objects/tip_product.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:contribkit/ui/widgets/app_icons.dart';
import 'package:contribkit/ui/widgets/app_sheet.dart';
import 'package:contribkit/ui/di/providers.dart';
import 'package:contribkit/ui/theme/app_colors.dart';
import 'package:contribkit/ui/theme/tokens.dart';
import 'package:contribkit/ui/widgets/app_button.dart';
import 'package:flutter/widgets.dart';
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
  List<TipProduct>? _products;
  bool _hasError = false;
  String? _purchasingId;
  String? _successId;
  String? _errorId;

  static const _meta = {
    'coffee': (emoji: '☕', label: 'Coffee'),
    'croissant': (emoji: '🥐', label: 'Croissant'),
    'lunch': (emoji: '🍱', label: 'Lunch'),
  };

  static ({String emoji, String label}) _metaFor(String id) {
    final key = id.toLowerCase();
    for (final entry in _meta.entries) {
      if (key.contains(entry.key)) return entry.value;
    }
    return (emoji: '🎁', label: 'Tip');
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final products = await ref.read(fetchTipProductsProvider).call();
      if (mounted) setState(() => _products = products);
    } catch (_) {
      if (mounted) setState(() => _hasError = true);
    }
  }

  Future<void> _purchase(TipProduct product) async {
    if (_purchasingId != null) return;
    setState(() {
      _purchasingId = product.id;
      _successId = null;
      _errorId = null;
    });
    try {
      await ref.read(purchaseTipProvider).call(product);
      if (mounted) {
        setState(() {
          _purchasingId = null;
          _successId = product.id;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _purchasingId = null;
          _errorId = product.id;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppSheet(
      title: const Text('Support ContribKit'),
      description: const Text(
        'ContribKit is free and open-source. A small tip helps keep it alive.',
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Tokens.space6,
          Tokens.space2,
          Tokens.space6,
          Tokens.space8,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: Tokens.space3,
          children: _content(context),
        ),
      ),
    );
  }

  List<Widget> _content(BuildContext context) {
    if (_hasError) {
      return [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: Tokens.space6),
          child: Text(
            'Could not load products. Check your connection.',
            style: TextStyle(
              fontSize: Tokens.textSm,
              color: AppColors.of(context).destructive,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        AppButton.ghost(
          onPressed: () {
            setState(() => _hasError = false);
            _load();
          },
          child: const Text('Retry'),
        ),
      ];
    }

    if (_products == null) {
      return List.generate(3, (_) => const _SkeletonTile());
    }

    final colors = AppColors.of(context);
    return [
      for (final p in _products!)
        _TierCard(
          product: p,
          emoji: _metaFor(p.id).emoji,
          label: _metaFor(p.id).label,
          isPurchasing: _purchasingId == p.id,
          isSuccess: _successId == p.id,
          isError: _errorId == p.id,
          disabled: _purchasingId != null,
          colors: colors,
          onTap: () => _purchase(p),
        ),
      const SizedBox(height: Tokens.space1),
      AppButton.ghost(
        onPressed: () => Navigator.of(context).pop(),
        child: Text(
          _successId != null ? 'Thanks! ❤️' : 'Maybe later',
          style: const TextStyle(fontSize: Tokens.textSm),
        ),
      ),
    ];
  }
}

class _TierCard extends StatelessWidget {
  const _TierCard({
    required this.product,
    required this.emoji,
    required this.label,
    required this.isPurchasing,
    required this.isSuccess,
    required this.isError,
    required this.disabled,
    required this.colors,
    required this.onTap,
  });

  final TipProduct product;
  final String emoji;
  final String label;
  final bool isPurchasing;
  final bool isSuccess;
  final bool isError;
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
          color: isSuccess ? colors.muted : colors.card,
          border: Border.all(
            color: isError
                ? colors.destructive
                : isSuccess
                ? colors.ring
                : colors.border,
            width: (isSuccess || isError) ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(Tokens.radiusMd),
        ),
        child: Row(
          children: [
            Text(
              emoji,
              style: const TextStyle(fontSize: Tokens.emojiSize, height: 1),
            ),
            const SizedBox(width: Tokens.space2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label,
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
            if (isPurchasing)
              Icon(
                    LucideIcons.loader2,
                    size: Tokens.iconMd,
                    color: colors.mutedForeground,
                  )
                  .animate(onPlay: (c) => c.repeat())
                  .rotate(duration: Tokens.durationSpin, curve: Curves.linear)
            else if (isSuccess)
              Icon(
                LucideIcons.check,
                size: Tokens.iconMd,
                color: colors.foreground,
              )
            else if (isError)
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
