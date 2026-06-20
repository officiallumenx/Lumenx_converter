import '../models/transport_route.dart';

const mockRoutes = <TransportRoute>[
  TransportRoute(
    id: 'RT-01',
    name: 'Route 01',
    code: 'R01',
    stopCount: 12,
    status: RouteStatus.active,
    vehicleReg: 'AP16AB1234',
    driverName: 'Ramesh Kumar',
  ),
  TransportRoute(
    id: 'RT-02',
    name: 'Route 02',
    code: 'R02',
    stopCount: 9,
    status: RouteStatus.active,
    vehicleReg: 'AP16AB5678',
    driverName: 'Suresh Babu',
  ),
  TransportRoute(
    id: 'RT-03',
    name: 'Route 03',
    code: 'R03',
    stopCount: 7,
    status: RouteStatus.active,
    vehicleReg: 'AP16AB9012',
    driverName: 'Venkata Rao',
  ),
];
