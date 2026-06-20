import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import 'lx_card.dart';

class LxDataTable extends StatelessWidget {
  const LxDataTable({
    super.key,
    required this.columns,
    required this.rows,
    this.emptyMessage = 'No data',
  });

  final List<String> columns;
  final List<List<String>> rows;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return LxCard(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: Text(
              emptyMessage,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.55),
                  ),
            ),
          ),
        ),
      );
    }

    return LxCard(
      padding: EdgeInsets.zero,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columns: [
              for (final col in columns) DataColumn(label: Text(col)),
            ],
            rows: [
              for (final row in rows)
                DataRow(
                  cells: [
                    for (final cell in row) DataCell(Text(cell)),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
