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

class ResetPasswordPage extends ConsumerStatefulWidget {
  const ResetPasswordPage({super.key});

  @override
  ConsumerState<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends ConsumerState<ResetPasswordPage> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _done = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .completePasswordReset(
            password: _passwordController.text,
            confirmPassword: _confirmController.text,
          );
      if (!mounted) return;
      setState(() {
        _loading = false;
        _done = true;
      });
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
    if (_done) {
      return AuthShell(
        title: 'Password updated',
        subtitle:
            'Your password has been reset. Sign in with your new password.',
        child: LxButton(
          label: 'Back to sign in',
          expanded: true,
          onPressed: () => context.go(RoutePaths.login),
        ),
      );
    }

    final flow = ref.read(authRepositoryProvider).pendingFlow;
    if (flow?.type != AuthFlowType.forgotPassword || !flow!.otpVerified) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(RoutePaths.login);
      });
      return const SizedBox.shrink();
    }

    return AuthShell(
      title: 'Reset password',
      subtitle: 'Create a new password for ${flow.driverId}.',
      showBack: true,
      onBack: () => context.go(RoutePaths.authOtp),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PasswordField(label: 'New password', controller: _passwordController),
          const SizedBox(height: AppSpacing.lg),
          PasswordField(
            label: 'Confirm password',
            controller: _confirmController,
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
            label: 'Update password',
            expanded: true,
            loading: _loading,
            onPressed: _loading ? null : _submit,
          ),
        ],
      ),
    );
  }
}
