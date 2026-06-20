import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_text_field.dart';
import '../data/profile_repository.dart';
import '../models/profile_models.dart';
import 'profile_controller.dart';
import 'widgets/profile_faq_list.dart';
import 'widgets/profile_shared_widgets.dart';

class SupportPage extends ConsumerStatefulWidget {
  const SupportPage({super.key});

  @override
  ConsumerState<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends ConsumerState<SupportPage> {
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final faqs = ref.watch(supportFaqsProvider);
    final contacts = ref.watch(supportContactsProvider);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSubpageHeader(title: 'Support center'),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Help, contacts, and issue reporting for transport operations.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Display mode', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: AppSpacing.sm),
          _ThemeModeSupportCard(
            selectedMode: ref.watch(themeModeProvider),
            onSelect: (mode) => setAppThemeMode(ref, mode),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Contact', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: AppSpacing.sm),
          for (final contact in contacts) ...[
            LxCard(
              onTap: () => _contactAction(context, contact),
              child: Row(
                children: [
                  Icon(_contactIcon(contact.icon), color: AppColors.primary),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          contact.label,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        Text(
                          contact.value,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 18),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Frequently asked questions',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileFaqList(faqs: faqs),
          const SizedBox(height: AppSpacing.xxl),
          Text(
            'Report an issue',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          LxTextField(
            label: 'Subject',
            controller: _subjectCtrl,
            prefixIcon: Icons.subject,
          ),
          const SizedBox(height: AppSpacing.lg),
          LxTextField(
            label: 'Describe the issue',
            controller: _messageCtrl,
            prefixIcon: Icons.message_outlined,
          ),
          const SizedBox(height: AppSpacing.lg),
          LxButton(
            label: 'Submit ticket',
            icon: Icons.send,
            expanded: true,
            loading: _submitting,
            onPressed: _submitting ? null : _submitTicket,
          ),
        ],
      ),
    );
  }

  IconData _contactIcon(String key) => switch (key) {
    'phone' => Icons.phone_outlined,
    'email' => Icons.email_outlined,
    'emergency' => Icons.emergency_outlined,
    _ => Icons.help_outline,
  };

  void _contactAction(BuildContext context, SupportContact contact) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Contacting ${contact.label}: ${contact.value}'),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  Future<void> _submitTicket() async {
    final subject = _subjectCtrl.text.trim();
    final message = _messageCtrl.text.trim();
    if (subject.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Please enter a subject and message'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      return;
    }

    setState(() => _submitting = true);
    await ref
        .read(profileRepositoryProvider)
        .submitSupportTicket(subject: subject, message: message);
    if (!mounted) return;
    setState(() => _submitting = false);

    _subjectCtrl.clear();
    _messageCtrl.clear();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Support ticket submitted · Ref #LX-4821'),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }
}

class _ThemeModeSupportCard extends StatelessWidget {
  const _ThemeModeSupportCard({
    required this.selectedMode,
    required this.onSelect,
  });

  final ThemeMode selectedMode;
  final ValueChanged<ThemeMode> onSelect;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Theme support', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Switch between Light, Dark, or System mode.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              _ThemeModeChip(
                label: 'Light Mode',
                selected: selectedMode == ThemeMode.light,
                onTap: () => onSelect(ThemeMode.light),
              ),
              _ThemeModeChip(
                label: 'Dark Mode',
                selected: selectedMode == ThemeMode.dark,
                onTap: () => onSelect(ThemeMode.dark),
              ),
              _ThemeModeChip(
                label: 'System Mode',
                selected: selectedMode == ThemeMode.system,
                onTap: () => onSelect(ThemeMode.system),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ThemeModeChip extends StatelessWidget {
  const _ThemeModeChip({
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
