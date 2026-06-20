import 'package:flutter/material.dart';

import 'lx_text_field.dart';

/// Connect-style search field — icon prefix, rounded-xl, h-11.
class LxSearchField extends StatelessWidget {
  const LxSearchField({
    super.key,
    required this.hint,
    required this.onChanged,
    this.controller,
  });

  final String hint;
  final ValueChanged<String> onChanged;
  final TextEditingController? controller;

  @override
  Widget build(BuildContext context) {
    return LxTextField(
      controller: controller,
      hint: hint,
      prefixIcon: Icons.search,
      onChanged: onChanged,
    );
  }
}
