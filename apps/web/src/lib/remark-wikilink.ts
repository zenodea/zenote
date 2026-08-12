import { findAndReplace } from "mdast-util-find-and-replace";
import type { Nodes, PhrasingContent, Root } from "mdast";
import { resolveWikilink, type WikilinkResolver } from "./wikilinks";

// [[target]] · [[target#heading]] · [[target|display]]
const WIKILINK = /\[\[([^\[\]|#]+)(?:#([^\[\]|]+))?(?:\|([^\[\]]+))?\]\]/g;

type Options = { resolver: WikilinkResolver };

export function remarkWikilink({ resolver }: Options) {
  return (tree: Root) => {
    findAndReplace(
      tree as Nodes,
      [
        WIKILINK,
        (_match: string, target: string, _heading: string, display: string) => {
          const label = (display ?? target).trim();
          const slug = resolveWikilink(resolver, target);

          if (!slug) return brokenLink(label, target);

          return {
            type: "link",
            url: `/notes/${slug}`,
            data: { hProperties: { className: ["wikilink"] } },
            children: [{ type: "text", value: label }],
          } satisfies PhrasingContent;
        },
      ],
      { ignore: ["link", "linkReference"] },
    );
  };
}

/** `hName` overrides the output element, so this emits a <span>, not an <em>. */
function brokenLink(label: string, target: string): PhrasingContent {
  return {
    type: "emphasis",
    data: {
      hName: "span",
      hProperties: {
        className: ["wikilink-broken"],
        title: `No note found for "${target.trim()}"`,
      },
    },
    children: [{ type: "text", value: label }],
  };
}
