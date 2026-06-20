import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/routing/router_refresh.dart';
import '../data/auth_repository.dart';
import '../models/auth_models.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authSessionProvider = Provider<AuthSession?>((ref) {
  return ref.watch(authControllerProvider).session;
});

final authPendingFlowProvider = Provider<AuthPendingFlow?>((ref) {
  ref.watch(authControllerProvider);
  return ref.read(authRepositoryProvider).pendingFlow;
});

class AuthController extends Notifier<AuthViewState> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  AuthViewState build() => AuthViewState(session: _repo.session);

  void _sync() {
    state = AuthViewState(session: _repo.session, tick: state.tick + 1);
    ref.read(routerRefreshProvider).notify();
  }

  Future<SignInResult> signIn({
    required String driverId,
    required String password,
  }) async {
    final result = await _repo.signInWithPassword(
      driverId: driverId,
      password: password,
    );
    if (result.kind == SignInResultKind.success ||
        result.kind == SignInResultKind.requiresOtp) {
      _sync();
    }
    return result;
  }

  Future<void> resendOtp() => _repo.sendOtpForPendingFlow();

  Future<bool> verifyOtp(String otp) async {
    final ok = await _repo.verifyOtp(otp);
    if (ok) {
      _sync();
    }
    return ok;
  }

  Future<void> completePasswordSetup({
    required String password,
    required String confirmPassword,
  }) async {
    await _repo.completePasswordSetup(
      password: password,
      confirmPassword: confirmPassword,
    );
    _sync();
  }

  Future<String> requestPasswordReset(String driverId) async {
    final masked = await _repo.requestPasswordReset(driverId);
    _sync();
    return masked;
  }

  Future<void> completePasswordReset({
    required String password,
    required String confirmPassword,
  }) async {
    await _repo.completePasswordReset(
      password: password,
      confirmPassword: confirmPassword,
    );
    _sync();
  }

  void signOut() {
    _repo.signOut();
    _sync();
  }

  void signInDirectForTesting(String driverId) {
    _repo.signInDirect(driverId);
    _sync();
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthViewState>(AuthController.new);

final isAuthenticatedProvider = Provider<bool>(
  (ref) => ref.watch(authSessionProvider) != null,
);
