import '../models/transport_student.dart';

const _firstNames = [
  'Aarav',
  'Ananya',
  'Arjun',
  'Bhavya',
  'Charan',
  'Deepika',
  'Esha',
  'Gopal',
  'Harini',
  'Ishaan',
  'Jahnavi',
  'Karthik',
  'Lakshmi',
  'Manoj',
  'Navya',
  'Omkar',
  'Priya',
  'Rahul',
  'Sneha',
  'Teja',
  'Uma',
  'Varun',
  'Yashika',
  'Aditya',
  'Bindu',
  'Chaitanya',
  'Divya',
  'Farhan',
  'Geetha',
  'Harsha',
];

const _lastNames = [
  'Reddy',
  'Rao',
  'Kumar',
  'Naidu',
  'Sharma',
  'Prasad',
  'Devi',
  'Murthy',
  'Chowdary',
  'Varma',
  'Goud',
  'Shetty',
  'Patel',
  'Singh',
  'Iyer',
];

const _stops = [
  'MG Road',
  'RTC Complex',
  'NTR Circle',
  'Gandhi Park',
  'Bus Stand',
  'Railway Colony',
  'University Gate',
  'Market Yard',
  'Temple Street',
  'Lake View',
  'Industrial Area',
  'Housing Board',
];

const _classes = ['6', '7', '8', '9', '10', '11', '12'];
const _sections = ['A', 'B', 'C'];

List<TransportStudent> buildMockStudents() {
  final students = <TransportStudent>[];
  const routeIds = ['RT-01', 'RT-02', 'RT-03'];

  for (var i = 0; i < 75; i++) {
    final routeId = routeIds[i % routeIds.length];
    final className = _classes[i % _classes.length];
    final section = _sections[i % _sections.length];
    students.add(
      TransportStudent(
        id: 'ST-${(i + 1).toString().padLeft(3, '0')}',
        name:
            '${_firstNames[i % _firstNames.length]} ${_lastNames[i % _lastNames.length]}',
        rollNo: '$className$section${(i % 30 + 1).toString().padLeft(2, '0')}',
        className: className,
        section: section,
        routeId: routeId,
        stopName: _stops[i % _stops.length],
        parentPhone: '+91 98${(70000000 + i).toString().substring(0, 8)}',
      ),
    );
  }
  return students;
}

final mockStudents = buildMockStudents();
