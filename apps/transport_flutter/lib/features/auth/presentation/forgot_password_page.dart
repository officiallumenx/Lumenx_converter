import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import 'auth_controller.dart';
import '../models/auth_models.dart';
import 'widgets/auth_shell.dart';
import 'widgets/driver_id_field.dart';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _driverIdController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _driverIdController.dispose();
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
          .requestPasswordReset(_driverIdController.text);
      if (!mounted) return;
      context.go(RoutePaths.authOtp);
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
    return AuthShell(
      title: 'Forgot password',
      subtitle:
          'Enter your Driver ID. We will send a one-time code to your registered phone.',
      showBack: true,
      onBack: () => context.go(RoutePaths.login),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriverIdField(controller: _driverIdController),
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
            label: 'Send OTP',
            expanded: true,
            loading: _loading,
            onPressed: _loading ? null : _submit,
          ),
        ],
      ),
    );
  }
}
