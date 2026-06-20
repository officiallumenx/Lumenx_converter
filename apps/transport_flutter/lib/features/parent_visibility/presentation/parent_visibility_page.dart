import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../features/auth/presentation/auth_controller.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_error_state.dart';
import '../../../shared/components/lx_section_card.dart';
import '../../../shared/components/lx_skeleton.dart';
import '../data/parent_visibility_repository.dart';
import '../models/parent_visibility_models.dart';

final parentVisibilitySnapshotProvider =
    FutureProvider<ParentVisibilitySnapshot?>((ref) async {
      final session = ref.watch(authSessionProvider);
      if (session == null) return null;
      return ref
          .read(parentVisibilityRepositoryProvider)
          .loadForDriver(session.driverId);
    });

class ParentVisibilityPage extends ConsumerWidget {
  const ParentVisibilityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshotAsync = ref.watch(parentVisibilitySnapshotProvider);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const PageHeader(
            title: 'Parent Visibility Demo',
            subtitle:
                'Preview how transport data appears inside LumenX Connect parent app.',
          ),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            switchInCurve: Curves.easeOutCubic,
            child: snapshotAsync.when(
              loading: () => const _LoadingView(key: ValueKey('loading')),
              error: (error, _) => LxErrorState(
                key: const ValueKey('error'),
                title: 'Could not load parent preview',
                message: error.toString(),
                onRetry: () => ref.invalidate(parentVisibilitySnapshotProvider),
              ),
              data: (snapshot) {
                if (snapshot == null) {
                  return const LxEmptyState(
                    key: ValueKey('empty'),
                    icon: Icons.visibility_off_outlined,
                    title: 'Parent visibility unavailable',
                    description:
                        'Sign in as an assigned driver to preview parent-facing transport updates.',
                  );
                }
                return _SuccessView(
                  key: const ValueKey('success'),
                  snapshot: snapshot,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  const _SuccessView({super.key, required this.snapshot});

  final ParentVisibilitySnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final statusStyle = _statusStyle(snapshot.tripStatus);

    return Column(
      children: [
        LxSectionCard(
          title: 'Transport Details Shared To Parent',
          child: Column(
            children: [
              _InfoRow(label: 'Bus Number', value: snapshot.busNumber),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(label: 'Driver Name', value: snapshot.driverName),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(label: 'Driver Phone', value: snapshot.driverPhone),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(label: 'Route', value: snapshot.routeName),
              const Divider(height: AppSpacing.xxl),
              Row(
                children: [
                  Text(
                    'Trip Status',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusStyle.background,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                    ),
                    child: Text(
                      statusStyle.label,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: statusStyle.foreground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        LxSectionCard(
          title: 'Live Tracking Placeholder',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                height: 180,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  border: Border.all(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.5),
                  ),
                  color: Theme.of(
                    context,
                  ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.25),
                ),
                child: const Center(child: Icon(Icons.map_outlined, size: 40)),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                snapshot.liveTrackingPlaceholder,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.65),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        const LxSectionCard(
          title: 'LumenX Connect Integration',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _IntegrationLine(
                icon: Icons.dashboard_outlined,
                text: 'Parent dashboard card shows latest trip status.',
              ),
              SizedBox(height: AppSpacing.sm),
              _IntegrationLine(
                icon: Icons.notifications_active_outlined,
                text:
                    'Route and trip updates are pushed as parent notifications.',
              ),
              SizedBox(height: AppSpacing.sm),
              _IntegrationLine(
                icon: Icons.access_time_outlined,
                text:
                    'Live tracking panel reuses the same timeline UX from Connect.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _IntegrationLine extends StatelessWidget {
  const _IntegrationLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(text, style: Theme.of(context).textTheme.bodySmall),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        const SizedBox(width: AppSpacing.md),
        Flexible(
          child: Text(
            value,
            maxLines: 2,
            textAlign: TextAlign.end,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

class _LoadingView extends StatelessWidget {
  const _LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const LxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LxSkeleton(height: 18, width: 220),
          SizedBox(height: AppSpacing.md),
          LxSkeleton(height: 16, width: 180),
          SizedBox(height: AppSpacing.sm),
          LxSkeleton(height: 16, width: 200),
          SizedBox(height: AppSpacing.sm),
          LxSkeleton(height: 16, width: 170),
          SizedBox(height: AppSpacing.lg),
          LxSkeleton(height: 160, borderRadius: AppSpacing.radiusLg),
        ],
      ),
    );
  }
}

class _StatusStyle {
  const _StatusStyle({
    required this.label,
    required this.foreground,
    required this.background,
  });

  final String label;
  final Color foreground;
  final Color background;
}

_StatusStyle _statusStyle(ParentTripStatus status) => switch (status) {
  ParentTripStatus.ready => const _StatusStyle(
    label: 'Ready',
    foreground: Color(0xFF9A6500),
    background: Color(0xFFFFF1CD),
  ),
  ParentTripStatus.inProgress => const _StatusStyle(
    label: 'In Progress',
    foreground: Color(0xFF0D5EA6),
    background: Color(0xFFDDEEFF),
  ),
  ParentTripStatus.completed => const _StatusStyle(
    label: 'Completed',
    foreground: Color(0xFF1F7A40),
    background: Color(0xFFDDF8E4),
  ),
};
