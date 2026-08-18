"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { classHighlighter, highlightCode } from "@lezer/highlight";

export function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [nodes, setNodes] = useState<ReactNode[] | null>(null);

  useEffect(() => {
    const description = LanguageDescription.matchLanguageName(
      languages,
      language,
      true,
    );
    if (!description) return;

    let cancelled = false;
    description
      .load()
      .then((support) => {
        if (cancelled) return;
        const tree = support.language.parser.parse(code);
        const result: ReactNode[] = [];
        let key = 0;
        highlightCode(
          code,
          tree,
          classHighlighter,
          (text, classes) => {
            result.push(
              classes ? (
                <span key={key++} className={classes}>
                  {text}
                </span>
              ) : (
                text
              ),
            );
          },
          () => {
            result.push("\n");
          },
        );
        setNodes(result);
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return <>{nodes ?? code}</>;
}
