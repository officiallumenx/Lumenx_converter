import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_skeleton.dart';

class DashboardLoadingView extends StatelessWidget {
  const DashboardLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        SizedBox(height: AppSpacing.md),
        _CardGridSkeleton(),
        SizedBox(height: AppSpacing.xxl),
        LxSkeleton(height: 210, borderRadius: AppSpacing.radiusLg),
      ],
    );
  }
}

class _CardGridSkeleton extends StatelessWidget {
  const _CardGridSkeleton();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth >= 760 ? 3 : 2;
        return GridView.builder(
          itemCount: 5,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            mainAxisSpacing: AppSpacing.md,
            crossAxisSpacing: AppSpacing.md,
            childAspectRatio: 1.35,
          ),
          itemBuilder: (context, index) =>
              const LxSkeleton(height: 132, borderRadius: AppSpacing.radiusLg),
        );
      },
    );
  }
}
