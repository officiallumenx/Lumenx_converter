import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_empty_state.dart';
import '../../../shared/components/lx_section_card.dart';
import '../models/trip_readiness_models.dart';
import 'trip_readiness_controller.dart';

class TripReadinessBlockedPage extends ConsumerWidget {
  const TripReadinessBlockedPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(tripReadinessControllerProvider);
    final session = state.valueOrNull;
    final failed = session?.failedRequirements ?? const <ReadinessRequirementStatus>[];

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const LxEmptyState(
                icon: Icons.block,
                title: 'Trip Start Blocked',
                description:
                    'One or more checks failed. Follow the instructions below and retry start trip.',
              ),
              const SizedBox(height: AppSpacing.xl),
              if (failed.isNotEmpty)
                LxSectionCard(
                  title: 'Failed Requirements',
                  child: Column(
                    children: failed
                        .map((item) => _FailureRow(item: item))
                        .toList(growable: false),
                  ),
                ),
              const SizedBox(height: AppSpacing.xl),
              LxButton(
                label: 'Resolve & Re-check',
                icon: Icons.sync,
                loading: session?.isChecking == true,
                expanded: true,
                onPressed: session == null || session.isChecking
                    ? null
                    : () async {
                        for (final item in failed) {
                          await ref
                              .read(tripReadinessControllerProvider.notifier)
                              .resolveRequirement(item.type);
                        }
                        final ok = await ref
                            .read(tripReadinessControllerProvider.notifier)
                            .attemptTripStart();
                        if (!context.mounted) return;
                        if (ok) {
                          ScaffoldMessenger.of(context)
                            ..hideCurrentSnackBar()
                            ..showSnackBar(
                              const SnackBar(
                                content: Text('All requirements passed. Trip unlocked.'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          context.go(RoutePaths.tripReadiness);
                        }
                      },
              ),
              const SizedBox(height: AppSpacing.md),
              LxButton(
                label: 'Back to trip workflow',
                icon: Icons.arrow_back,
                expanded: true,
                variant: LxButtonVariant.outline,
                onPressed: () => context.go(RoutePaths.tripReadiness),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FailureRow extends StatelessWidget {
  const _FailureRow({required this.item});

  final ReadinessRequirementStatus item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, size: 18, color: Colors.redAccent),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.label,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  item.description,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Action: ${item.actionableInstruction}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.redAccent,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

