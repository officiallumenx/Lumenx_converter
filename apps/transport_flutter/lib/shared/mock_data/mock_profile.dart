import '../../core/constants/app_constants.dart';
import '../models/profile.dart';

const mockProfile = UserProfile(
  id: AppConstants.demoDriverId,
  name: AppConstants.demoDriverName,
  email: AppConstants.demoUserEmail,
  role: 'School Bus Driver',
  institute: AppConstants.instituteName,
  phone: '+91 98765 43210',
  department: 'Route 01 · Morning & afternoon runs',
);
