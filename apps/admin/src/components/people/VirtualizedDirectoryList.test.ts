import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VirtualizedDirectoryList } from "./VirtualizedDirectoryList";

describe("VirtualizedDirectoryList", () => {
  it("renders only a window of rows for large lists", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      id: `id-${i}`,
      name: `Person ${i}`,
    }));
    const TypedList = VirtualizedDirectoryList<{ id: string; name: string }>;
    const html = renderToStaticMarkup(
      createElement(TypedList, {
        items,
        estimateRowHeight: 72,
        overscan: 2,
        getKey: (item) => item.id,
        renderRow: (item) =>
          createElement("div", { "data-row": item.id }, item.name),
      }),
    );
    expect(html).toContain("Person 0");
    expect(html).not.toContain("Person 199");
    expect((html.match(/data-row=/g) ?? []).length).toBeLessThan(40);
  });
});
