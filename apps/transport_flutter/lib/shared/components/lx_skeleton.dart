import 'package:flutter/material.dart';

import '../../core/constants/breakpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

class LxSkeleton extends StatefulWidget {
  const LxSkeleton({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = AppSpacing.radiusMd,
  });

  final double? width;
  final double height;
  final double borderRadius;

  @override
  State<LxSkeleton> createState() => _LxSkeletonState();
}

class _LxSkeletonState extends State<LxSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            color: Color.lerp(
              isDark ? AppColors.darkMuted : AppColors.muted,
              isDark ? AppColors.darkBorder : AppColors.border,
              _controller.value,
            ),
          ),
        );
      },
    );
  }
}

class LxSkeletonList extends StatelessWidget {
  const LxSkeletonList({super.key, this.count = 4});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < count; i++) ...[
          if (i > 0) const SizedBox(height: AppSpacing.md),
          const LxSkeleton(height: 56, borderRadius: AppSpacing.radiusLg),
        ],
      ],
    );
  }
}

class LxStatSkeletonGrid extends StatelessWidget {
  const LxStatSkeletonGrid({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth >= Breakpoints.gridCompact ? 4 : 2;
        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          childAspectRatio: 1.35,
          children: List.generate(
            4,
            (_) => const LxSkeleton(borderRadius: AppSpacing.radius2xl),
          ),
        );
      },
    );
  }
}

/// Connect `PageSkeleton` — title, subtitle, stat grid, row placeholders.
class LxPageSkeleton extends StatelessWidget {
  const LxPageSkeleton({super.key, this.rows = 4});

  final int rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const LxSkeleton(
          height: 40,
          width: 192,
          borderRadius: AppSpacing.radiusMd,
        ),
        const SizedBox(height: AppSpacing.md),
        const LxSkeleton(
          height: 20,
          width: 280,
          borderRadius: AppSpacing.radiusSm,
        ),
        const SizedBox(height: AppSpacing.lg),
        const LxStatSkeletonGrid(),
        const SizedBox(height: AppSpacing.lg),
        for (var i = 0; i < rows; i++) ...[
          if (i > 0) const SizedBox(height: AppSpacing.md),
          const LxSkeleton(height: 64, borderRadius: AppSpacing.radius2xl),
        ],
      ],
    );
  }
}
