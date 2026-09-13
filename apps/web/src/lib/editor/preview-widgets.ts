import { EditorView, WidgetType } from "@codemirror/view";
import katex from "katex";
import { attachmentUrl } from "@/lib/attachments";
import { formatDue, isPast } from "@/lib/todos";
import type { WikilinkResolver } from "@/lib/wikilinks";
import { renderInlineDom } from "./inline-render";

export class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly attachment: boolean,
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.attachment === this.attachment
    );
  }

  toDOM(view: EditorView) {
    const host = document.createElement("span");
    host.className = "cm-embed";

    const image = document.createElement("img");
    image.alt = this.alt || this.src;
    image.addEventListener("load", () => view.requestMeasure());

    const fail = () => {
      const broken = document.createElement("span");
      broken.className = "wikilink-broken";
      broken.title = `No image found for "${this.src}"`;
      broken.textContent = this.alt || this.src;
      host.replaceChildren(broken);
      view.requestMeasure();
    };

    image.addEventListener("error", fail);
    host.append(image);

    if (!this.attachment) {
      image.src = this.src;
      return host;
    }

    attachmentUrl(this.src).then((url) => {
      if (url) image.src = url;
      else fail();
    });
    return host;
  }

  ignoreEvent() {
    return false;
  }
}

export class TodoWidget extends WidgetType {
  constructor(
    readonly done: boolean,
    readonly text: string,
    readonly due: string | null,
  ) {
    super();
  }

  eq(other: TodoWidget) {
    return (
      other.done === this.done &&
      other.text === this.text &&
      other.due === this.due
    );
  }

  toDOM() {
    const host = document.createElement("span");
    host.className = `todo ${this.done ? "todo-done" : "todo-open"}`;
    if (!this.done && isPast(this.due)) host.classList.add("todo-overdue");

    const box = document.createElement("span");
    box.className = "todo-box";

    const label = document.createElement("span");
    label.className = "todo-text";
    label.textContent = this.text;

    host.append(box, label);

    const when = formatDue(this.due);
    if (when !== null) {
      const badge = document.createElement("span");
      badge.className = "todo-due";
      badge.textContent = when;
      host.append(badge);
    }
    return host;
  }

  ignoreEvent() {
    return false;
  }
}

export class MathWidget extends WidgetType {
  constructor(
    readonly tex: string,
    readonly display: boolean,
  ) {
    super();
  }

  eq(other: MathWidget) {
    return other.tex === this.tex && other.display === this.display;
  }

  toDOM() {
    const host = document.createElement("span");
    host.className = this.display ? "cm-math cm-math-display" : "cm-math";
    host.innerHTML = katex.renderToString(this.tex, {
      displayMode: this.display,
      throwOnError: false,
    });
    return host;
  }

  ignoreEvent() {
    return false;
  }
}

export class RuleWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const host = document.createElement("span");
    host.className = "cm-rule";
    host.append(document.createElement("hr"));
    return host;
  }

  ignoreEvent() {
    return false;
  }
}

const ALIGNMENT = /^(:?)-+(:?)$/;

function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";

  for (let at = 0; at < trimmed.length; at += 1) {
    if (trimmed[at] === "\\" && trimmed[at + 1] === "|") {
      current += "|";
      at += 1;
      continue;
    }
    if (trimmed[at] === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += trimmed[at];
  }

  cells.push(current.trim());
  return cells;
}

function alignments(cells: string[]): (string | null)[] {
  return cells.map((cell) => {
    const match = ALIGNMENT.exec(cell.trim());
    if (!match) return null;
    if (match[1] && match[2]) return "center";
    if (match[2]) return "right";
    return match[1] ? "left" : null;
  });
}

export class TableWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly resolver: WikilinkResolver,
  ) {
    super();
  }

  eq(other: TableWidget) {
    return other.source === this.source && other.resolver === this.resolver;
  }

  toDOM() {
    const lines = this.source.split("\n").filter((line) => line.trim() !== "");
    const header = splitCells(lines[0]);
    const align = alignments(splitCells(lines[1] ?? ""));

    const host = document.createElement("div");
    host.className = "cm-table-wrap";

    const table = document.createElement("table");
    table.className = "cm-table";

    const head = document.createElement("thead");
    head.append(this.row(header, align, "th"));
    table.append(head);

    const body = document.createElement("tbody");
    for (const line of lines.slice(2)) {
      body.append(this.row(splitCells(line), align, "td"));
    }
    if (body.childNodes.length > 0) table.append(body);

    host.append(table);
    return host;
  }

  row(cells: string[], align: (string | null)[], tag: string) {
    const row = document.createElement("tr");

    cells.forEach((cell, index) => {
      const element = document.createElement(tag);
      if (align[index]) element.style.textAlign = align[index]!;
      element.append(renderInlineDom(cell, this.resolver));
      row.append(element);
    });

    return row;
  }

  ignoreEvent() {
    return false;
  }
}
