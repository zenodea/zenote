import { findAndReplace } from "mdast-util-find-and-replace";
import type { Nodes, PhrasingContent, Root } from "mdast";
import { normaliseTag, tagRegex } from "./tags";

export function remarkTag() {
  return (tree: Root) => {
    findAndReplace(
      tree as Nodes,
      [
        tagRegex(),
        (_match: string, tag: string): PhrasingContent => ({
          type: "link",
          url: `/tags/${normaliseTag(tag)}`,
          data: { hProperties: { className: ["tag"] } },
          children: [{ type: "text", value: `` }],
        }),
      ],
      { ignore: ["link", "linkReference", "heading"] },
    );
  };
}
