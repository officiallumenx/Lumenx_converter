import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../models/profile_models.dart';

class ProfileFaqList extends StatefulWidget {
  const ProfileFaqList({super.key, required this.faqs});

  final List<SupportFaq> faqs;

  @override
  State<ProfileFaqList> createState() => _ProfileFaqListState();
}

class _ProfileFaqListState extends State<ProfileFaqList> {
  int? _expandedIndex;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < widget.faqs.length; i++) ...[
            if (i > 0) const Divider(height: 1),
            InkWell(
              onTap: () => setState(() {
                _expandedIndex = _expandedIndex == i ? null : i;
              }),
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.faqs[i].question,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                        Icon(
                          _expandedIndex == i
                              ? Icons.expand_less
                              : Icons.expand_more,
                          size: 20,
                        ),
                      ],
                    ),
                    if (_expandedIndex == i) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        widget.faqs[i].answer,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
