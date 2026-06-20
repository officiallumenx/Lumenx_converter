import 'package:flutter/material.dart';

import '../../../../shared/components/lx_text_field.dart';

class DriverIdField extends StatelessWidget {
  const DriverIdField({super.key, required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return LxTextField(
      label: 'Driver ID',
      hint: 'e.g. DR-01',
      controller: controller,
    );
  }
}
