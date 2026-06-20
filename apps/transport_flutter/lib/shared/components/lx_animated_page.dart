import 'package:flutter/material.dart';

/// Connect `animate-in-up` — fade + 4px translate on page enter.
class LxAnimatedPage extends StatefulWidget {
  const LxAnimatedPage({
    super.key,
    required this.child,
    this.routeKey,
  });

  final Widget child;
  final Object? routeKey;

  @override
  State<LxAnimatedPage> createState() => _LxAnimatedPageState();
}

class _LxAnimatedPageState extends State<LxAnimatedPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  late final Animation<Offset> _offset;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    );
    final curve = CurvedAnimation(
      parent: _controller,
      curve: const Cubic(0.22, 1, 0.36, 1),
    );
    _opacity = Tween<double>(begin: 0, end: 1).animate(curve);
    _offset = Tween<Offset>(
      begin: const Offset(0, 0.015),
      end: Offset.zero,
    ).animate(curve);
    _controller.forward();
  }

  @override
  void didUpdateWidget(LxAnimatedPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.routeKey != oldWidget.routeKey) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    if (reduceMotion) return widget.child;

    return FadeTransition(
      opacity: _opacity,
      child: SlideTransition(
        position: _offset,
        child: widget.child,
      ),
    );
  }
}
