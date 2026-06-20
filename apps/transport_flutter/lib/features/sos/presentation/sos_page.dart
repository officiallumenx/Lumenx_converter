import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_dialog.dart';
import '../../../shared/components/lx_empty_state.dart';
import '../../../shared/components/lx_section_card.dart';
import '../models/sos_models.dart';
import 'sos_controller.dart';

class SosPage extends ConsumerStatefulWidget {
  const SosPage({super.key});

  @override
  ConsumerState<SosPage> createState() => _SosPageState();
}

class _SosPageState extends ConsumerState<SosPage> {
  bool _submitting = false;

  @override
  Widget build(BuildContext context) {
    final selected = ref.watch(sosSelectedTypeProvider);
    final history = ref.watch(sosHistoryControllerProvider).valueOrNull ?? const [];

    return RefreshIndicator(
      onRefresh: () => ref.read(sosHistoryControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'SOS',
              subtitle: 'Emergency escalation for transport incidents',
              actions: [
                TextButton.icon(
                  onPressed: () => context.push(RoutePaths.sosHistory),
                  icon: const Icon(Icons.history, size: 18),
                  label: const Text('History'),
                ),
              ],
            ),
            _sosButton(context, selected),
            const SizedBox(height: AppSpacing.lg),
            _EmergencyTypeGrid(
              selected: selected,
              onSelect: (type) =>
                  ref.read(sosSelectedTypeProvider.notifier).state = type,
            ),
            const SizedBox(height: AppSpacing.lg),
            LxSectionCard(
              title: 'Recent Emergency Alerts',
              child: history.isEmpty
                  ? const LxEmptyState(
                      icon: Icons.shield_outlined,
                      title: 'No emergency alerts yet',
                      description: 'Triggered SOS alerts will appear here.',
                    )
                  : Column(
                      children: [
                        for (var i = 0; i < history.take(3).length; i++) ...[
                          if (i > 0) const Divider(height: AppSpacing.xl),
                          _SosHistoryRow(record: history[i]),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sosButton(BuildContext context, SosEmergencyType? selected) {
    return LxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Tap only in real emergency scenarios',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Workflow: SOS -> Select Emergency Type -> Confirm -> Admin Alert Created.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: AppSpacing.lg),
          LxButton(
            label: 'SOS',
            icon: Icons.sos,
            expanded: true,
            loading: _submitting,
            variant: LxButtonVariant.destructive,
            onPressed: _submitting || selected == null
                ? null
                : () => _confirmAndTrigger(selected),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmAndTrigger(SosEmergencyType selected) async {
    final confirmed = await LxDialog.show<bool>(
      context: context,
      title: 'Confirm SOS Alert',
      message:
          'Emergency Type: ${selected.label}\n\nAdmin alert will be created immediately. Continue?',
      confirmLabel: 'Create Alert',
      cancelLabel: 'Cancel',
      destructive: true,
    );
    if (confirmed != true || !mounted) return;

    setState(() => _submitting = true);
    final alert = await ref
        .read(sosHistoryControllerProvider.notifier)
        .triggerSos(selected);
    if (!mounted) return;
    setState(() => _submitting = false);

    if (alert == null) return;
    ref.read(sosSelectedTypeProvider.notifier).state = null;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Admin alert created · ${alert.type.label}'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.destructive,
        ),
      );
  }
}

class SosHistoryPage extends ConsumerWidget {
  const SosHistoryPage({super.key});

  static final _timeFmt = DateFormat('dd MMM · h:mm a');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(sosHistoryControllerProvider);
    return RefreshIndicator(
      onRefresh: () => ref.read(sosHistoryControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Emergency History',
              subtitle: 'Read-only SOS alerts sent to admin',
              actions: [
                TextButton.icon(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back, size: 18),
                  label: const Text('Back'),
                ),
              ],
            ),
            historyAsync.when(
              loading: () => const LxCard(
                child: Padding(
                  padding: EdgeInsets.all(AppSpacing.xxxl),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
              error: (error, _) => LxEmptyState(
                icon: Icons.error_outline,
                title: 'Could not load history',
                description: error.toString(),
              ),
              data: (history) {
                if (history.isEmpty) {
                  return const LxEmptyState(
                    icon: Icons.history_toggle_off,
                    title: 'No SOS history found',
                    description: 'SOS alerts you create will be listed here.',
                  );
                }
                return LxSectionCard(
                  title: '${history.length} alerts',
                  child: Column(
                    children: [
                      for (var i = 0; i < history.length; i++) ...[
                        if (i > 0) const Divider(height: AppSpacing.xxl),
                        _SosHistoryRow(
                          record: history[i],
                          timeLabel: _timeFmt.format(history[i].createdAt),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _EmergencyTypeGrid extends StatelessWidget {
  const _EmergencyTypeGrid({
    required this.selected,
    required this.onSelect,
  });

  final SosEmergencyType? selected;
  final ValueChanged<SosEmergencyType> onSelect;

  @override
  Widget build(BuildContext context) {
    return LxSectionCard(
      title: 'Select Emergency Type',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final cols = constraints.maxWidth >= 720 ? 2 : 1;
          return GridView.count(
            crossAxisCount: cols,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppSpacing.md,
            crossAxisSpacing: AppSpacing.md,
            childAspectRatio: cols == 1 ? 2.9 : 1.8,
            children: [
              for (final type in SosEmergencyType.values)
                _EmergencyTypeCard(
                  type: type,
                  selected: selected == type,
                  onTap: () => onSelect(type),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _EmergencyTypeCard extends StatelessWidget {
  const _EmergencyTypeCard({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final SosEmergencyType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      onTap: onTap,
      backgroundColor: selected
          ? AppColors.destructive.withValues(alpha: 0.08)
          : null,
      child: Row(
        children: [
          Icon(
            _icon(type),
            color: selected ? AppColors.destructive : null,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  type.label,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  type.description,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _icon(SosEmergencyType type) => switch (type) {
        SosEmergencyType.breakdown => Icons.build_circle_outlined,
        SosEmergencyType.accident => Icons.car_crash_outlined,
        SosEmergencyType.medicalEmergency => Icons.medical_services_outlined,
        SosEmergencyType.safetyIssue => Icons.health_and_safety_outlined,
      };
}

class _SosHistoryRow extends StatelessWidget {
  const _SosHistoryRow({
    required this.record,
    this.timeLabel,
  });

  final SosAlertRecord record;
  final String? timeLabel;

  @override
  Widget build(BuildContext context) {
    final label = timeLabel ?? DateFormat('dd MMM · h:mm a').format(record.createdAt);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.destructive.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          child: const Icon(Icons.sos, color: AppColors.destructive, size: 20),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                record.type.label,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              Text(
                '${record.routeName} · ${record.vehicleReg}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
        if (record.adminAlertCreated)
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: 4,
            ),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: const Text(
              'Admin Alert Created',
              style: TextStyle(
                color: AppColors.success,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

