import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import 'auth_controller.dart';
import '../models/auth_models.dart';
import 'widgets/auth_shell.dart';
import 'widgets/password_field.dart';

class CreatePasswordPage extends ConsumerStatefulWidget {
  const CreatePasswordPage({super.key});

  @override
  ConsumerState<CreatePasswordPage> createState() => _CreatePasswordPageState();
}

class _CreatePasswordPageState extends ConsumerState<CreatePasswordPage> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  bool get _canSubmit {
    final flow = ref.read(authRepositoryProvider).pendingFlow;
    return flow?.type == AuthFlowType.firstLogin && flow!.otpVerified;
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .completePasswordSetup(
            password: _passwordController.text,
            confirmPassword: _confirmController.text,
          );
      if (!mounted) return;
      context.go(RoutePaths.home);
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_canSubmit) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(RoutePaths.authOtp);
      });
      return const SizedBox.shrink();
    }

    final driverName =
        ref.read(authRepositoryProvider).pendingFlow?.driverId ?? '';

    return AuthShell(
      title: 'Create password',
      subtitle:
          'Choose a secure password for $driverName. You will use this on future sign-ins.',
      showBack: true,
      onBack: () => context.go(RoutePaths.authOtp),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PasswordField(
            label: 'New password',
            controller: _passwordController,
            hint: 'Min 8 chars, 1 uppercase, 1 number',
          ),
          const SizedBox(height: AppSpacing.lg),
          PasswordField(
            label: 'Confirm password',
            controller: _confirmController,
            hint: 'Re-enter your password',
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.error,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
          LxButton(
            label: 'Save & continue',
            expanded: true,
            loading: _loading,
            onPressed: _loading ? null : _submit,
          ),
        ],
      ),
    );
  }
}
