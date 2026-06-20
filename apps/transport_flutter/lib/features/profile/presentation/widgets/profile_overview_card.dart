import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../models/profile_models.dart';

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.initials,
    this.styleKey = 'classic-blue',
    this.size = 64,
  });

  final String initials;
  final String styleKey;
  final double size;

  @override
  Widget build(BuildContext context) {
    final palette = _paletteForStyle(styleKey);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: palette,
        ),
        boxShadow: [
          BoxShadow(
            color: palette.first.withValues(alpha: 0.35),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.36,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class ProfileOverviewCard extends StatelessWidget {
  const ProfileOverviewCard({super.key, required this.profile});

  final EditableProfile profile;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ProfileAvatar(
          initials: profile.initials,
          styleKey: profile.photoStyleKey,
          size: 72,
        ),
        const SizedBox(width: AppSpacing.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(profile.name, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 2),
              Text(
                profile.role,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                profile.department,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              Text(
                profile.email,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

List<Color> _paletteForStyle(String styleKey) => switch (styleKey) {
  'sunset-orange' => [const Color(0xFFFB8C00), const Color(0xFFF4511E)],
  'forest-green' => [const Color(0xFF43A047), const Color(0xFF1B5E20)],
  'royal-purple' => [const Color(0xFF7E57C2), const Color(0xFF4527A0)],
  _ => [AppColors.primary, Color.lerp(AppColors.primary, Colors.black, 0.2)!],
};
