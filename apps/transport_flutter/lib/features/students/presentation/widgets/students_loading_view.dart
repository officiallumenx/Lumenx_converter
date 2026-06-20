import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_skeleton.dart';

class StudentsLoadingView extends StatelessWidget {
  const StudentsLoadingView({super.key, this.count = 6});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const LxSkeleton(height: 48, borderRadius: AppSpacing.radiusLg),
        const SizedBox(height: AppSpacing.md),
        const LxSkeleton(height: 36, borderRadius: AppSpacing.radiusLg),
        const SizedBox(height: AppSpacing.lg),
        for (var i = 0; i < count; i++) ...[
          if (i > 0) const SizedBox(height: AppSpacing.md),
          const LxSkeleton(height: 88, borderRadius: AppSpacing.radiusLg),
        ],
      ],
    );
  }
}
