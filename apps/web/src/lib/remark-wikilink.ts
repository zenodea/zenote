import { findAndReplace } from "mdast-util-find-and-replace";
import type { Nodes, PhrasingContent, Root } from "mdast";
import {
  isImageName,
  resolveWikilink,
  wikilinkRegex,
  type WikilinkResolver,
} from "./wikilinks";

type Options = { resolver: WikilinkResolver };

export const ATTACHMENT_PROTOCOL = "attachment:";

function embedRegex(): RegExp {
  const source = wikilinkRegex().source;
  return new RegExp(`!?${source}`, "g");
}

export function remarkWikilink({ resolver }: Options) {
  return (tree: Root) => {
    findAndReplace(
      tree as Nodes,
      [
        embedRegex(),
        (match: string, target: string, _heading: string, display: string) => {
          const embed = match.startsWith("!");
          const label = (display ?? target).trim();

          if (embed && isImageName(target)) {
            return {
              type: "image",
              url: `${ATTACHMENT_PROTOCOL}${target.trim()}`,
              alt: label,
            } satisfies PhrasingContent;
          }

          const slug = resolveWikilink(resolver, target);
          const node: PhrasingContent = !slug
            ? brokenLink(label, target)
            : {
                type: "link",
                url: `/notes/${slug}`,
                data: { hProperties: { className: ["wikilink"] } },
                children: [{ type: "text", value: label }],
              };

          return embed ? [{ type: "text", value: "!" }, node] : node;
        },
      ],
      { ignore: ["link", "linkReference"] },
    );
  };
}

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
