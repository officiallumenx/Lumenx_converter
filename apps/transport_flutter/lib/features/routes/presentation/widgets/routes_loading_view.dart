import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_skeleton.dart';

class RoutesLoadingView extends StatelessWidget {
  const RoutesLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const LxSkeleton(height: 48, borderRadius: AppSpacing.radiusLg),
        const SizedBox(height: AppSpacing.md),
        const LxSkeleton(height: 40, borderRadius: AppSpacing.radiusLg),
        const SizedBox(height: AppSpacing.lg),
        for (var i = 0; i < 3; i++) ...[
          if (i > 0) const SizedBox(height: AppSpacing.md),
          const LxSkeleton(height: 120, borderRadius: AppSpacing.radiusLg),
        ],
      ],
    );
  }
}
