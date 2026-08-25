export type HubViewConfig<TView extends string> = {
  views: readonly TView[];
  defaultView: TView;
  aliases?: Partial<Record<string, TView>>;
};

export function parseHubView<TView extends string>(
  raw: unknown,
  config: HubViewConfig<TView>,
): TView {
  if (typeof raw === "string" && config.aliases?.[raw]) {
    return config.aliases[raw]!;
  }
  const value = typeof raw === "string" ? raw : "";
  return config.views.includes(value as TView) ? (value as TView) : config.defaultView;
}

export function validateHubViewSearch<TView extends string>(
  search: Record<string, unknown>,
  config: HubViewConfig<TView>,
): { view: TView } {
  return {
    view: parseHubView(search.view, config),
  };
}
