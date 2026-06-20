import '../models/vehicle.dart';

const mockVehicles = <Vehicle>[
  Vehicle(
    id: 'VH-01',
    registrationNo: 'AP16AB1234',
    capacity: 40,
    status: VehicleStatus.active,
    routeId: 'RT-01',
    model: 'Tata Starbus Ultra',
  ),
  Vehicle(
    id: 'VH-02',
    registrationNo: 'AP16AB5678',
    capacity: 35,
    status: VehicleStatus.active,
    routeId: 'RT-02',
    model: 'Ashok Leyland Oyster',
  ),
  Vehicle(
    id: 'VH-03',
    registrationNo: 'AP16AB9012',
    capacity: 32,
    status: VehicleStatus.active,
    routeId: 'RT-03',
    model: 'Eicher Skyline Pro',
  ),
  Vehicle(
    id: 'VH-04',
    registrationNo: 'AP16AB3456',
    capacity: 45,
    status: VehicleStatus.inactive,
    model: 'Force Traveller Monobus',
  ),
  Vehicle(
    id: 'VH-05',
    registrationNo: 'AP16AB7890',
    capacity: 38,
    status: VehicleStatus.maintenance,
    model: 'Tata Marcopolo Starbus',
  ),
];
