import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/components/lx_empty_state.dart';
import '../../shared/components/lx_skeleton.dart';

class FeatureAsyncBody<T> extends StatelessWidget {
  const FeatureAsyncBody({
    super.key,
    required this.asyncValue,
    required this.builder,
    this.loading,
    this.empty,
  });

  final AsyncValue<T> asyncValue;
  final Widget Function(T data) builder;
  final Widget? loading;
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      loading: () => loading ?? const LxSkeletonList(count: 5),
      error: (e, _) => LxEmptyState(
        title: 'Something went wrong',
        description: e.toString(),
        icon: Icons.error_outline,
      ),
      data: (data) {
        if (data is List && data.isEmpty) {
          return empty ??
              const LxEmptyState(
                title: 'No records yet',
                description: 'Phase 1 foundation — data will appear here.',
              );
        }
        return builder(data);
      },
    );
  }
}
