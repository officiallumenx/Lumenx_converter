import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../data/profile_repository.dart';
import 'profile_controller.dart';
import 'widgets/profile_overview_card.dart';
import 'widgets/profile_shared_widgets.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  static const _photoStyles = <({String key, String label})>[
    (key: 'classic-blue', label: 'Classic Blue'),
    (key: 'sunset-orange', label: 'Sunset Orange'),
    (key: 'forest-green', label: 'Forest Green'),
    (key: 'royal-purple', label: 'Royal Purple'),
  ];

  late String _selectedPhotoStyle;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile =
        ref.read(profileControllerProvider).valueOrNull ??
        ref.read(profileRepositoryProvider).loadProfileSync();
    _selectedPhotoStyle = profile.photoStyleKey;
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileControllerProvider).valueOrNull;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSubpageHeader(title: 'Edit profile'),
          const SizedBox(height: AppSpacing.lg),
          if (profile != null) ...[
            LxCard(
              child: Row(
                children: [
                  ProfileAvatar(
                    initials: profile.initials,
                    styleKey: _selectedPhotoStyle,
                    size: 72,
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Profile photo',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Only profile photo can be edited by drivers.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurface.withValues(alpha: 0.55),
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('Photo style', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                for (final option in _photoStyles)
                  _PhotoStyleChip(
                    label: option.label,
                    selected: _selectedPhotoStyle == option.key,
                    onTap: () =>
                        setState(() => _selectedPhotoStyle = option.key),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            LxCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Read-only details',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _LockedField(label: 'Name', value: profile.name),
                  const Divider(height: AppSpacing.xxl),
                  _LockedField(label: 'Employee ID', value: profile.id),
                  const Divider(height: AppSpacing.xxl),
                  _LockedField(label: 'Phone', value: profile.phone),
                  const Divider(height: AppSpacing.xxl),
                  _LockedField(label: 'Route', value: profile.routeName),
                  const Divider(height: AppSpacing.xxl),
                  _LockedField(label: 'Vehicle', value: profile.vehicleReg),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.xxl),
          LxButton(
            label: 'Save photo',
            icon: Icons.photo_camera_outlined,
            expanded: true,
            loading: _saving,
            onPressed: _saving ? null : _save,
          ),
        ],
      ),
    );
  }

  Future<void> _save() async {
    final current = ref.read(profileControllerProvider).valueOrNull;
    if (current == null) return;

    setState(() => _saving = true);
    await ref
        .read(profileControllerProvider.notifier)
        .updatePhotoStyle(_selectedPhotoStyle);
    if (!mounted) return;
    setState(() => _saving = false);

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Profile photo updated'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    Navigator.of(context).pop();
  }
}

class _LockedField extends StatelessWidget {
  const _LockedField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        const Icon(Icons.lock_outline, size: 14),
        const SizedBox(width: AppSpacing.xs),
        Flexible(
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

class _PhotoStyleChip extends StatelessWidget {
  const _PhotoStyleChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}
