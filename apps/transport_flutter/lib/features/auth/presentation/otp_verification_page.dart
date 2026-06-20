import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import '../data/demo_credentials.dart';
import 'auth_controller.dart';
import '../models/auth_models.dart';
import 'widgets/auth_shell.dart';
import 'widgets/otp_input.dart';

class OtpVerificationPage extends ConsumerStatefulWidget {
  const OtpVerificationPage({super.key});

  @override
  ConsumerState<OtpVerificationPage> createState() =>
      _OtpVerificationPageState();
}

class _OtpVerificationPageState extends ConsumerState<OtpVerificationPage> {
  final _otpController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  AuthPendingFlow? get _flow => ref.read(authRepositoryProvider).pendingFlow;

  String get _maskedPhone {
    final flow = _flow;
    if (flow == null) return 'your phone';
    return ref
            .read(authRepositoryProvider)
            .accountFor(flow.driverId)
            ?.maskedPhone ??
        'your phone';
  }

  Future<void> _verify() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final ok = await ref
        .read(authControllerProvider.notifier)
        .verifyOtp(_otpController.text);

    if (!mounted) return;
    setState(() => _loading = false);

    if (!ok) {
      setState(
        () => _error = 'Incorrect OTP. Demo code: ${DemoDriverCredentials.otp}',
      );
      return;
    }

    final flow = ref.read(authRepositoryProvider).pendingFlow;
    if (flow == null) {
      context.go(RoutePaths.login);
      return;
    }

    switch (flow.type) {
      case AuthFlowType.firstLogin:
        context.go(RoutePaths.authCreatePassword);
      case AuthFlowType.forgotPassword:
        context.go(RoutePaths.authResetPassword);
    }
  }

  @override
  Widget build(BuildContext context) {
    final flow = _flow;
    if (flow == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(RoutePaths.login);
      });
      return const SizedBox.shrink();
    }

    final isFirstLogin = flow.type == AuthFlowType.firstLogin;

    return AuthShell(
      title: 'Verify OTP',
      subtitle: isFirstLogin
          ? 'First-time setup — enter the 6-digit code sent to $_maskedPhone.'
          : 'Enter the verification code sent to $_maskedPhone.',
      showBack: true,
      onBack: () => context.go(RoutePaths.login),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OtpInput(controller: _otpController),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Demo OTP: ${DemoDriverCredentials.otp}',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.55),
            ),
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
            label: 'Verify',
            expanded: true,
            loading: _loading,
            onPressed: _loading ? null : _verify,
          ),
        ],
      ),
    );
  }
}
