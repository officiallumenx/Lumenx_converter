import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_stat_card.dart';
import '../../../shared/models/trip.dart';
import '../../../shared/repositories/repositories.dart';
import '../../feature_async_body.dart';

class TripsPage extends ConsumerWidget {
  const TripsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    final timeFmt = DateFormat('dd MMM · HH:mm');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PageHeader(
          title: 'Trips',
          subtitle: 'Completed · In progress · Scheduled',
        ),
        FeatureAsyncBody<List<Trip>>(
          asyncValue: trips,
          builder: (data) {
            final completed =
                data.where((t) => t.status == TripStatus.completed).length;
            final inProgress =
                data.where((t) => t.status == TripStatus.inProgress).length;
            final scheduled =
                data.where((t) => t.status == TripStatus.scheduled).length;

            return Column(
              children: [
                GridView.count(
                  crossAxisCount: 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: AppSpacing.md,
                  crossAxisSpacing: AppSpacing.md,
                  childAspectRatio: 1.4,
                  children: [
                    LxStatCard(
                      label: 'Completed',
                      value: '$completed',
                      icon: Icons.check_circle,
                      tone: LxStatTone.primary,
                    ),
                    LxStatCard(
                      label: 'In progress',
                      value: '$inProgress',
                      icon: Icons.play_circle,
                      tone: LxStatTone.success,
                    ),
                    LxStatCard(
                      label: 'Scheduled',
                      value: '$scheduled',
                      icon: Icons.schedule,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xxl),
                for (final t in data)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: LxCard(
                      child: ListTile(
                        title: Text(t.routeName),
                        subtitle: Text(
                          '${t.id} · ${t.vehicleReg ?? '—'} · ${timeFmt.format(t.scheduledAt)}',
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              _statusLabel(t.status),
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text('${t.studentsOnBoard} onboard'),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

String _statusLabel(TripStatus s) => switch (s) {
      TripStatus.inProgress => 'In progress',
      TripStatus.completed => 'Completed',
      TripStatus.scheduled => 'Scheduled',
      TripStatus.delayed => 'Delayed',
      TripStatus.cancelled => 'Cancelled',
    };
