import 'package:flutter/material.dart';

import 'route_paths.dart';

class NavDestination {
  const NavDestination({
    required this.path,
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String path;
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Driver app navigation — 4 destinations only.
const kNavDestinations = <NavDestination>[
  NavDestination(
    path: RoutePaths.home,
    label: 'Home',
    icon: Icons.home_outlined,
    selectedIcon: Icons.home,
  ),
  NavDestination(
    path: RoutePaths.attendance,
    label: 'Attendance',
    icon: Icons.fact_check_outlined,
    selectedIcon: Icons.fact_check,
  ),
  NavDestination(
    path: RoutePaths.notifications,
    label: 'Notifications',
    icon: Icons.notifications_outlined,
    selectedIcon: Icons.notifications,
  ),
  NavDestination(
    path: RoutePaths.profile,
    label: 'Profile',
    icon: Icons.person_outline,
    selectedIcon: Icons.person,
  ),
];

/// All driver tabs fit in mobile bottom nav — no overflow menu.
const kMobilePrimaryNavCount = 4;
