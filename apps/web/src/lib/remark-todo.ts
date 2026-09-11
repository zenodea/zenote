import { findAndReplace } from "mdast-util-find-and-replace";
import type { Nodes, PhrasingContent, Root } from "mdast";
import { formatDue, isPast, todoRegex } from "./todos";

function span(className: string, children: PhrasingContent[]): PhrasingContent {
  return {
    type: "emphasis",
    data: { hName: "span", hProperties: { className: [className] } },
    children,
  };
}

export function remarkTodo() {
  return (tree: Root) => {
    findAndReplace(
      tree as Nodes,
      [
        todoRegex(),
        (
          _match: string,
          done: string,
          text: string,
          due: string,
        ): PhrasingContent => {
          const when = due?.trim() || null;
          const label = formatDue(when);
          const classes = ["todo", done === "x" ? "todo-done" : "todo-open"];
          if (done !== "x" && isPast(when)) classes.push("todo-overdue");

          return {
            type: "emphasis",
            data: {
              hName: "span",
              hProperties: { className: classes },
            },
            children: [
              span("todo-box", []),
              span("todo-text", [{ type: "text", value: text.trim() }]),
              ...(label === null
                ? []
                : [span("todo-due", [{ type: "text", value: label }])]),
            ],
          };
        },
      ],
      { ignore: ["link", "linkReference"] },
    );
  };
}
