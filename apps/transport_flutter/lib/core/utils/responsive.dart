import 'package:flutter/material.dart';

import '../constants/breakpoints.dart';

enum LayoutTier { mobile, tablet, desktop }

LayoutTier layoutTierOf(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width >= Breakpoints.tablet) return LayoutTier.desktop;
  if (width >= Breakpoints.mobile) return LayoutTier.tablet;
  return LayoutTier.mobile;
}

bool isMobile(BuildContext context) =>
    layoutTierOf(context) == LayoutTier.mobile;

bool isTablet(BuildContext context) =>
    layoutTierOf(context) == LayoutTier.tablet;

bool isDesktop(BuildContext context) =>
    layoutTierOf(context) == LayoutTier.desktop;
