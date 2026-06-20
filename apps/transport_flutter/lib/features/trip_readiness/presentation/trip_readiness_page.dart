import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_error_state.dart';
import '../../../shared/components/lx_section_card.dart';
import '../../../shared/components/lx_skeleton.dart';
import '../models/trip_readiness_models.dart';
import 'trip_readiness_controller.dart';

class TripReadinessPage extends ConsumerWidget {
  const TripReadinessPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(tripReadinessControllerProvider);
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(tripReadinessControllerProvider);
            await ref.read(tripReadinessControllerProvider.future);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: state.when(
              loading: () => const _LoadingView(),
              error: (error, _) => _ErrorView(error: error.toString()),
              data: (session) => _Content(session: session),
            ),
          ),
        ),
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.session});

  final TripReadinessSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completed = session.workflowStatus == TripWorkflowStatus.completed;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PageHeader(
          title: 'Start Trip Workflow',
          subtitle: '${session.driverName} · ${session.routeName}',
          actions: [
            LxButton(
              label: 'Back',
              variant: LxButtonVariant.outline,
              size: LxButtonSize.sm,
              onPressed: () => context.pop(),
            ),
          ],
        ),
        _WorkflowStatusCard(session: session),
        const SizedBox(height: AppSpacing.xl),
        const _FlowSequenceCard(),
        const SizedBox(height: AppSpacing.xl),
        _RequirementsList(session: session),
        const SizedBox(height: AppSpacing.xl),
        if (completed) ...[
          const LxCard(
            child: Row(
              children: [
                Icon(Icons.check_circle, color: AppColors.success),
                SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text('Trip Started. All checks passed successfully.'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
        LxButton(
          label: completed ? 'Back to Dashboard' : 'Start Trip',
          icon: Icons.play_circle_outline,
          loading: session.isChecking,
          expanded: true,
          onPressed: session.isChecking || completed
              ? null
              : () async {
                  final ok = await ref
                      .read(tripReadinessControllerProvider.notifier)
                      .attemptTripStart();
                  if (!context.mounted) return;
                  if (ok) {
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Trip can start. All requirements passed.',
                          ),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    context.go(RoutePaths.home);
                    return;
                  }
                  context.push(RoutePaths.tripReadinessBlocked);
                },
        ),
        if (completed) ...[
          const SizedBox(height: AppSpacing.md),
          LxButton(
            label: 'Go to Dashboard',
            variant: LxButtonVariant.outline,
            expanded: true,
            onPressed: () => context.go(RoutePaths.home),
          ),
        ],
      ],
    );
  }
}

class _WorkflowStatusCard extends StatelessWidget {
  const _WorkflowStatusCard({required this.session});

  final TripReadinessSession session;

  @override
  Widget build(BuildContext context) {
    return LxSectionCard(
      title: 'Trip Status',
      child: Row(
        children: [
          const Icon(Icons.flag_circle_outlined),
          const SizedBox(width: AppSpacing.sm),
          Text(
            session.workflowStatusLabel,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const Spacer(),
          Text(
            session.vehicleReg,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _FlowSequenceCard extends StatelessWidget {
  const _FlowSequenceCard();

  @override
  Widget build(BuildContext context) {
    return LxSectionCard(
      title: 'Check Sequence',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _FlowStep(text: 'Start Trip'),
          _FlowStep(text: 'GPS Check'),
          _FlowStep(text: 'Internet Check'),
          _FlowStep(text: 'Location Permission Check'),
          _FlowStep(text: 'Notification Permission Check'),
          _FlowStep(text: 'Trip Started', isLast: true),
        ],
      ),
    );
  }
}

class _FlowStep extends StatelessWidget {
  const _FlowStep({required this.text, this.isLast = false});

  final String text;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.sm),
      child: Row(
        children: [
          const Icon(Icons.chevron_right, size: 16),
          const SizedBox(width: AppSpacing.xs),
          Text(text, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _RequirementsList extends StatelessWidget {
  const _RequirementsList({required this.session});

  final TripReadinessSession session;

  @override
  Widget build(BuildContext context) {
    return LxSectionCard(
      title: 'Live Validation',
      child: Column(
        children: [
          for (var i = 0; i < session.requirements.length; i++)
            _RequirementTile(
              requirement: session.requirements[i],
              stepIndex: i,
              session: session,
            ),
        ],
      ),
    );
  }
}

class _RequirementTile extends StatelessWidget {
  const _RequirementTile({
    required this.requirement,
    required this.stepIndex,
    required this.session,
  });

  final ReadinessRequirementStatus requirement;
  final int stepIndex;
  final TripReadinessSession session;

  @override
  Widget build(BuildContext context) {
    final active = session.isChecking && stepIndex == session.currentStepIndex;
    final failed =
        session.hasAttemptedStart &&
        !requirement.passed &&
        stepIndex < session.currentStepIndex;
    final passed = requirement.passed;

    final toneColor = passed
        ? AppColors.success
        : failed
        ? AppColors.destructive
        : active
        ? AppColors.primary
        : AppColors.warning;
    final icon = passed
        ? Icons.check_circle
        : failed
        ? Icons.cancel
        : active
        ? Icons.hourglass_top
        : Icons.radio_button_unchecked;
    final statusText = passed
        ? 'Passed'
        : failed
        ? 'Failed'
        : active
        ? 'Checking...'
        : 'Pending';

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: toneColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: toneColor.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: toneColor),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  requirement.label,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  statusText,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: toneColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  requirement.description,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                if (failed) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Action: ${requirement.actionableInstruction}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.destructive,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return const LxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LxSkeleton(height: 24, width: 220),
          SizedBox(height: AppSpacing.lg),
          LxSkeleton(height: 56, borderRadius: AppSpacing.radiusLg),
          SizedBox(height: AppSpacing.md),
          LxSkeleton(height: 56, borderRadius: AppSpacing.radiusLg),
          SizedBox(height: AppSpacing.md),
          LxSkeleton(height: 56, borderRadius: AppSpacing.radiusLg),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) {
    return LxErrorState(
      title: 'Trip readiness unavailable',
      message: error,
      onRetry: () => context.go(RoutePaths.tripReadiness),
    );
  }
}
