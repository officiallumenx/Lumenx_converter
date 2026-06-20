import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';

class StudentAvatar extends StatelessWidget {
  const StudentAvatar({
    super.key,
    required this.initials,
    required this.color,
    this.size = 56,
    this.photoUrl,
  });

  final String initials;
  final Color color;
  final double size;
  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color,
            Color.lerp(color, Colors.black, 0.15)!,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.35),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.34,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
      ),
    );
  }
}

class StudentPhotoHeader extends StatelessWidget {
  const StudentPhotoHeader({
    super.key,
    required this.initials,
    required this.color,
    required this.name,
    required this.rollNo,
  });

  final String initials;
  final Color color;
  final String name;
  final String rollNo;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        StudentAvatar(initials: initials, color: color, size: 88),
        const SizedBox(height: AppSpacing.lg),
        Text(name, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Roll $rollNo',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
              ),
        ),
      ],
    );
  }
}
