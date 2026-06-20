import '../models/driver.dart';

const mockDrivers = <Driver>[
  Driver(
    id: 'DR-01',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    status: DriverStatus.active,
    licenseNo: 'AP16-20180012345',
    routeId: 'RT-01',
  ),
  Driver(
    id: 'DR-02',
    name: 'Suresh Babu',
    phone: '+91 98765 43211',
    status: DriverStatus.active,
    licenseNo: 'AP16-20190054321',
    routeId: 'RT-02',
  ),
  Driver(
    id: 'DR-03',
    name: 'Venkata Rao',
    phone: '+91 98765 43212',
    status: DriverStatus.active,
    licenseNo: 'AP16-20200098765',
    routeId: 'RT-03',
  ),
  Driver(
    id: 'DR-04',
    name: 'Prakash Reddy',
    phone: '+91 98765 43213',
    status: DriverStatus.onLeave,
    licenseNo: 'AP16-20170045678',
  ),
  Driver(
    id: 'DR-05',
    name: 'Anil Sharma',
    phone: '+91 98765 43214',
    status: DriverStatus.inactive,
    licenseNo: 'AP16-20160011223',
  ),
];
