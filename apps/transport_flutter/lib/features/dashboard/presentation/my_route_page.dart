import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_empty_state.dart';
import '../../../shared/components/lx_search_field.dart';
import '../../../shared/components/lx_section_card.dart';
import '../../../shared/components/lx_stat_card.dart';
import '../../../shared/mock_data/mock_students.dart';
import '../../../shared/models/transport_student.dart';
import '../../routes/data/routes_repository.dart';
import '../../routes/presentation/widgets/routes_loading_view.dart';
import '../../routes/models/route_models.dart';
import 'dashboard_controller.dart';

/// Read-only view of assigned route details for the signed-in driver.
class MyRoutePage extends ConsumerStatefulWidget {
  const MyRoutePage({super.key});

  @override
  ConsumerState<MyRoutePage> createState() => _MyRoutePageState();
}

class _MyRoutePageState extends ConsumerState<MyRoutePage> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(dashboardControllerProvider).valueOrNull;
    if (snapshot == null) {
      return const SingleChildScrollView(
        child: RoutesLoadingView(),
      );
    }

    final detail = buildRouteDetail(snapshot.routeId);
    if (detail == null) {
      return const SingleChildScrollView(
        child: LxEmptyState(
          icon: Icons.route_outlined,
          title: 'Route not assigned',
          description: 'Your route details will appear once transport admin assigns a route.',
        ),
      );
    }

    final students = _filterStudents(detail, _query);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'My Route',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Read-only route assignment details',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: AppSpacing.xl),
          _TopStats(detail: detail),
          const SizedBox(height: AppSpacing.xl),
          _DriverDetailsCard(detail: detail),
          const SizedBox(height: AppSpacing.md),
          _VehicleDetailsCard(detail: detail),
          const SizedBox(height: AppSpacing.md),
          _RouteStopsCard(detail: detail),
          const SizedBox(height: AppSpacing.md),
          LxSectionCard(
            title: 'Assigned Students',
            action: SizedBox(
              width: 220,
              child: LxSearchField(
                hint: 'Search students',
                controller: _searchController,
                onChanged: (value) => setState(() => _query = value),
              ),
            ),
            child: students.isEmpty
                ? const LxEmptyState(
                    icon: Icons.search_off,
                    title: 'No students found',
                    description: 'Try another name, roll number, or stop.',
                  )
                : _StudentsList(students: students),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'All details are read-only. Updates are managed in LumenX Admin.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55),
                ),
          ),
        ],
      ),
    );
  }

  List<TransportStudent> _filterStudents(RouteDetail detail, String query) {
    final assignedIds = detail.students.map((s) => s.id).toSet();
    final assignedStudents =
        mockStudents.where((student) => assignedIds.contains(student.id)).toList();
    if (query.trim().isEmpty) return assignedStudents;
    final needle = query.trim().toLowerCase();
    return assignedStudents.where((student) {
      return student.name.toLowerCase().contains(needle) ||
          student.rollNo.toLowerCase().contains(needle) ||
          student.stopName.toLowerCase().contains(needle);
    }).toList(growable: false);
  }
}

class _TopStats extends StatelessWidget {
  const _TopStats({required this.detail});

  final RouteDetail detail;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cols = constraints.maxWidth > 960 ? 3 : 1;
        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          childAspectRatio: cols == 1 ? 3.2 : 1.3,
          children: [
            LxStatCard(
              label: 'Route Name',
              value: detail.route.name,
              icon: Icons.route_outlined,
              tone: LxStatTone.primary,
              hint: detail.route.code,
            ),
            LxStatCard(
              label: 'Vehicle',
              value: detail.vehicle?.registrationNo ?? 'Not Assigned',
              icon: Icons.directions_bus_outlined,
              tone: LxStatTone.success,
              hint: detail.vehicle?.model ?? 'Vehicle details',
            ),
            LxStatCard(
              label: 'Students Count',
              value: '${detail.students.length}',
              icon: Icons.groups_outlined,
              hint: '${detail.stops.length} stops',
            ),
          ],
        );
      },
    );
  }
}

class _DriverDetailsCard extends StatelessWidget {
  const _DriverDetailsCard({required this.detail});

  final RouteDetail detail;

  @override
  Widget build(BuildContext context) {
    final driver = detail.driver;
    return LxSectionCard(
      title: 'Driver Details',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _line(context, 'Name', driver?.name ?? detail.route.driverName ?? 'Not assigned'),
          _line(context, 'Driver ID', driver?.id ?? 'Not available'),
          _line(context, 'Phone', driver?.phone ?? 'Not available'),
          _line(context, 'License', driver?.licenseNo ?? 'Not available'),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VehicleDetailsCard extends StatelessWidget {
  const _VehicleDetailsCard({required this.detail});

  final RouteDetail detail;

  @override
  Widget build(BuildContext context) {
    final vehicle = detail.vehicle;
    return LxSectionCard(
      title: 'Vehicle Details',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _line(context, 'Registration', vehicle?.registrationNo ?? 'Not available'),
          _line(context, 'Model', vehicle?.model ?? 'Not available'),
          _line(context, 'Capacity', vehicle != null ? '${vehicle.capacity} seats' : 'Not available'),
          _line(
            context,
            'Status',
            vehicle != null
                ? vehicle.status.name[0].toUpperCase() + vehicle.status.name.substring(1)
                : 'Not available',
          ),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RouteStopsCard extends StatelessWidget {
  const _RouteStopsCard({required this.detail});

  final RouteDetail detail;

  @override
  Widget build(BuildContext context) {
    return LxSectionCard(
      title: 'Route Stops',
      child: LxCard(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            for (var i = 0; i < detail.stops.length; i++) ...[
              if (i > 0) const Divider(height: 1),
              ListTile(
                leading: CircleAvatar(
                  radius: 14,
                  child: Text('${detail.stops[i].order}'),
                ),
                title: Text(detail.stops[i].name),
                trailing: Text(detail.stops[i].pickupTime),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StudentsList extends StatelessWidget {
  const _StudentsList({required this.students});

  final List<TransportStudent> students;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < students.length; i++) ...[
            if (i > 0) const Divider(height: 1),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person_outline, size: 18)),
              title: Text(students[i].name),
              subtitle: Text(
                'Roll ${students[i].rollNo} · ${students[i].className}-${students[i].section} · ${students[i].stopName}',
              ),
            ),
          ],
        ],
      ),
    );
  }
}
