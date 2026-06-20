import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import 'auth_controller.dart';
import '../models/auth_models.dart';
import 'widgets/auth_shell.dart';
import 'widgets/demo_credentials_card.dart';
import 'widgets/driver_id_field.dart';
import 'widgets/password_field.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _driverIdController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _driverIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final result = await ref.read(authControllerProvider.notifier).signIn(
          driverId: _driverIdController.text,
          password: _passwordController.text,
        );

    if (!mounted) return;
    setState(() => _loading = false);

    switch (result.kind) {
      case SignInResultKind.success:
        context.go(RoutePaths.home);
      case SignInResultKind.requiresOtp:
        context.go(RoutePaths.authOtp);
      case SignInResultKind.invalidCredentials:
      case SignInResultKind.accountNotFound:
      case SignInResultKind.accountInactive:
        setState(() => _error = result.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      title: 'Driver sign in',
      subtitle:
          'Enter your Driver ID and password to access attendance, routes, and notifications.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriverIdField(controller: _driverIdController),
          const SizedBox(height: AppSpacing.lg),
          PasswordField(
            label: 'Password',
            controller: _passwordController,
            hint: 'Default or your new password',
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
            label: 'Sign in',
            icon: Icons.login,
            expanded: true,
            loading: _loading,
            onPressed: _loading ? null : _submit,
          ),
          const SizedBox(height: AppSpacing.md),
          Align(
            alignment: Alignment.center,
            child: TextButton(
              onPressed: () => context.push(RoutePaths.authForgotPassword),
              child: const Text('Forgot password?'),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          const DemoCredentialsCard(),
        ],
      ),
    );
  }
}
