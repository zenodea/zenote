<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/wordmark-dark.svg">
  <img src=".github/assets/wordmark-light.svg" alt="Zenote" width="300">
</picture>

A markdown vault you open in a browser: linked notes, a map of how they connect,
and an assistant that can read them.

[![CI](https://github.com/zenodea/zenote/actions/workflows/ci.yml/badge.svg)](https://github.com/zenodea/zenote/actions/workflows/ci.yml)
[![Deploy](https://github.com/zenodea/zenote/actions/workflows/deploy.yml/badge.svg)](https://github.com/zenodea/zenote/actions/workflows/deploy.yml)
[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-8b5cf6.svg)](LICENSE)

</div>

![The whole vault as a graph](.github/assets/screenshots/graph.png)

## The idea

Write in markdown. Link notes with `[[double brackets]]` and group them with `#tags`.
Everything saves as you type and is there from any browser you sign in on.

The picture above is the whole vault. Every dot is a note, every line a link between two of
them.

## Reading

<img src=".github/assets/screenshots/reading.png" alt="A note in the reading view">

Notes render with headings, code, tables, maths and diagrams. Links to other notes are
clickable, and links to notes you have not written yet are marked instead of broken.

At the bottom of each note: the notes around it in the graph, and **Linked from**, every place
in the vault that mentions this one, quoted in context.

## Writing

<img src=".github/assets/screenshots/editor.png" alt="The editor with Vim keybindings">

The editor keeps your markdown as you wrote it and formats it as you go. Type `[[` and it
suggests notes to link to. There is a Vim mode if you want one.

Saving happens on its own. If the same note is open in another tab, you get told rather than
losing what you typed.

## Asking

<img src=".github/assets/screenshots/assistant.png" alt="The assistant answering a question about a note">

An assistant sits next to the note you are reading. It answers from your own notes, shows
which ones it opened, and can write notes back if you let it. Each conversation stays with its
note.

## Finding

<img src=".github/assets/screenshots/quick-switcher.png" alt="The quick switcher">

`⌘K` jumps to any note by name. `⌘F` searches inside the one you are reading. The sidebar
searches titles or full text and filters by tag. Search runs in the browser, so results come
up as you type.

## Mobile mode

<p>
  <img src=".github/assets/screenshots/mobile-note.png" alt="A note on a phone" width="270">
  <img src=".github/assets/screenshots/mobile-drawer.png" alt="The vault on a phone" width="270">
</p>

The web app also support mobile formats.

## Themes

Six themes, each with a dark and a light version.

![The six themes, dark and light](.github/assets/themes.svg)

## Shortcuts

| Keys  | Does                   |
| ----- | ---------------------- |
| `⌘K`  | Jump to a note         |
| `⌘F`  | Find in this note      |
| `/`   | Search the graph       |
| `Esc` | Close whatever is open |

## Built with

Next.js and React, CodeMirror for the editor, PixiJS for the graph, Supabase for the database
and the login, Gemini for the assistant. It runs on Vercel, and every push is checked and
shipped by GitHub Actions.

## License

[GPL-3.0](LICENSE).
