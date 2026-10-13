/* The try vault: a small working copy of the Zenote app that keeps its notes in localStorage.
   Structure, copy and behaviour follow apps/web/src (Sidebar, NoteTree, NoteView, TodosView,
   QuickSwitcher, FindBar); the editor is the app's own CodeMirror
   setup, bundled in try-editor.js. */
(function () {
  var KEY = "zenote-try-vault-v2";
  var OLD_KEY = "zenote-try-vault";
  var INBOX = "Todos";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var TODO_SOURCE = "!!(x?)\\[([^\\[\\]]*)\\](?:\\[([^\\[\\]]*)\\])?";
  var WIKILINK_SOURCE = "\\[\\[([^\\[\\]|#]+)(?:#([^\\[\\]|]+))?(?:\\|([^\\[\\]]+))?\\]\\]";
  var TAG_SOURCE = "(^|[\\s(\\[{])#([A-Za-z0-9_-]*[A-Za-z][A-Za-z0-9_-]*)";
  var CODE_SPLIT = /(```[\s\S]*?```|`[^`\n]*`)/g;

  var I = {
    chevron: '<svg class="tv-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
    ellipsis: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="13" cy="8" r="1.4"/></svg>',
    menu: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/></svg>',
    sliders: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2 3.5h12M2 8h12M2 12.5h12"/><circle cx="10.5" cy="3.5" r="1.75" fill="var(--bg)"/><circle cx="5.5" cy="8" r="1.75" fill="var(--bg)"/><circle cx="10.5" cy="12.5" r="1.75" fill="var(--bg)"/></svg>',
    graph: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4 12 5.5 6.5 12 4 4"/><circle cx="4" cy="4" r="1.75" fill="var(--bg)"/><circle cx="12" cy="5.5" r="1.75" fill="var(--bg)"/><circle cx="6.5" cy="12" r="1.75" fill="var(--bg)"/></svg>',
    filePlus: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5l-4-4Z"/><path d="M9 1.5V5.5h4M8 8v4M6 10h4"/></svg>',
    folderPlus: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 3.5a1 1 0 0 1 1-1h3l1.5 2h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-9Z"/><path d="M8 7.5v4M6 9.5h4"/></svg>',
    pencil: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2 14 4.5 5.5 13 2 14l1-3.5L11.5 2Z"/></svg>',
    todo: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.4 14.6 8 8 14.6 1.4 8Z"/><path d="M5.4 8 7.2 9.8 10.6 6.2"/></svg>',
    logo: '<svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M16 16h32M16 32h22M16 48h32" stroke="var(--fg)" stroke-width="6.5" stroke-linecap="round"/><path d="M51 13 13 51" stroke="var(--accent)" stroke-width="6.5" stroke-linecap="round"/></svg>'
  };

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function filename(slug) { return slug.slice(slug.lastIndexOf("/") + 1); }
  function folderOf(slug) { var i = slug.lastIndexOf("/"); return i < 0 ? "" : slug.slice(0, i); }
  function join(folder, name) { return folder ? folder + "/" + name : name; }
  function sanitize(raw) {
    var name = String(raw).trim().replace(/\.md$/i, "").replace(/^\/+|\/+$/g, "");
    if (!name || name.split("/").some(function (p) { return !p.trim() || p === ".."; })) return null;
    return name;
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function longDate(ms) { var d = new Date(ms); return d.getDate() + " " + MONTHS_LONG[d.getMonth()] + " " + d.getFullYear(); }
  function stripCode(body) { return body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, ""); }

  /* ---------------- todos (lib/todos.ts) ---------------- */
  function dueDate(due) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(due || "");
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
  }
  function hasTime(due) { return /[T ]\d{2}:\d{2}/.test(due || ""); }
  function formatDue(due, now) {
    if (due == null) return null;
    now = now || new Date();
    var d = dueDate(due); if (!d) return due;
    var day = d.getDate() + " " + MONTHS[d.getMonth()] + (d.getFullYear() === now.getFullYear() ? "" : " " + d.getFullYear());
    return hasTime(due) ? day + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) : day;
  }
  function isPast(due, now) {
    now = now || new Date();
    var d = dueDate(due); if (!d) return false;
    return hasTime(due) ? d.getTime() < now.getTime() : d.getTime() < startOfDay(now).getTime();
  }
  function parseTodos(body) {
    var todos = [], offset = 0;
    body.split(CODE_SPLIT).forEach(function (seg, part) {
      if (part % 2 === 0) {
        var re = new RegExp(TODO_SOURCE, "g"), m;
        while ((m = re.exec(seg))) {
          todos.push({ done: m[1] === "x", text: m[2].trim(), due: (m[3] || "").trim() || null, offset: offset + m.index, length: m[0].length, index: todos.length });
        }
      }
      offset += seg.length;
    });
    return todos;
  }
  function formatTodo(done, text, due) { return "!!" + (done ? "x" : "") + "[" + text + "]" + (due == null ? "" : "[" + due + "]"); }

  /* ---------------- the vault ---------------- */
  function seed() {
    var now = new Date(), t = now.getTime();
    var today = dayKey(now);
    var notes = {
      "Welcome": "# Welcome\n\nThis is a small Zenote vault that lives in this browser. Edit anything: it saves as you type, and nothing leaves this page.\n\nThe sidebar is the vault. Folders open and close, the **…** on a row moves things around, and the search button looks through titles or full text.\n\n- Start with [[linking]], then try [[markdown]]\n- [[Todos]] collects every todo in the vault\n- Press ⌘K to jump to a note and ⌘F to find in this one\n- A link to a note you have not written yet, like [[ideas]], is marked instead of broken\n\n#start",
      "Todos": "# Todos\n\n" + formatTodo(false, "call the bank", dayKey(addDays(now, -1))) + "\n" + formatTodo(false, "read up on caching", today + "T20:00") + "\n" + formatTodo(false, "write the weekly review", dayKey(addDays(now, 3))) + "\n" + formatTodo(false, "renew the passport", dayKey(addDays(now, 24))) + "\n" + formatTodo(false, "someday learn the cello", null) + "\n" + formatTodo(true, "open the try vault", today) + "\n",
      "guides/linking": "# Linking\n\nType two brackets and a name to link a note: [[Welcome]]. While editing, `[[` opens a list of notes to pick from.\n\nEvery note shows **Linked from** at the bottom: each place in the vault that mentions it, quoted in context. Above it, a small graph of the notes around it.\n\nLinks are how [[the-graph]] gets its lines.\n\n#start",
      "guides/markdown": "# Markdown\n\nHeadings, **bold**, *italic* and `inline code` work as you would expect, and the editor formats them as you type.\n\n> The editor keeps your markdown as you wrote it.\n\n```js\nconst vault = await open(\"zenote\");\nvault.notes.length; // 12\n```\n\n| Shortcut | Does |\n| --- | --- |\n| ⌘K | Jump to a note |\n| ⌘F | Find in this note |\n| / | Search the graph |\n\n1. Numbered lists\n2. and bullet lists\n3. both render\n\nTodos are markdown too: !![tick this one][" + today + "]\n\nSee [[redis]] for a note with real content.",
      "guides/the-graph": "# The graph\n\nEvery dot is a note, every line a link between two of them. Open it from the graph button at the bottom of the sidebar.\n\nRight-click a note to focus it and its neighbours, search to zoom in, and drag empty space to pan.\n\nBack to [[Welcome]].",
      "backend/redis": "# Redis\n\nAn in-memory data structure server. Values are strings, hashes, lists, sets, sorted sets and streams, each with its own commands.\n\nCommands run on a single thread, so each one is atomic without any [[locking]] on your side.\n\nThe usual jobs are a [[caching]] layer, a session store and a rate limiter built from expiring counters. For data that must survive, reach for [[postgres]].\n\n```\nredis-cli> INCR rate:ip:203.0.113.9\n(integer) 1\n```\n\n#backend #nosql",
      "backend/caching": "# Caching\n\nKeep expensive results near the caller. The hard part is invalidation: decide what makes an entry stale before you add the cache.\n\n[[redis]] is the usual home for an application-level cache.\n\n#backend",
      "backend/postgres": "# Postgres\n\nA relational database with transactions, MVCC and a planner that is usually smarter than you. Reads never block writes.\n\nPair it with [[caching]] only once a query is measured to be slow.\n\n#backend #sql"
    };
    var out = {};
    Object.keys(notes).forEach(function (slug, i) { out[slug] = { slug: slug, body: notes[slug], created: t - (8 - i) * 3600e3, updated: t - (8 - i) * 3600e3 }; });
    return {
      name: "Try vault",
      notes: out,
      folders: ["guides", "backend"],
      settings: { sidebarCollapsed: false, showBacklinks: true, showGraph: true, openInEditMode: false, vimMode: false, searchMode: "titles", provider: "anthropic", aiWrites: true, aiVaultOnly: false },
      last: "Welcome",
      saved: false
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var v = JSON.parse(raw);
        if (v && v.notes) { v.saved = true; v.settings = Object.assign(seed().settings, v.settings || {}); v.folders = v.folders || []; return v; }
      }
      var old = localStorage.getItem(OLD_KEY);
      if (old) {
        var o = JSON.parse(old), s = seed();
        if (o && o.notes) {
          Object.keys(o.notes).forEach(function (slug) {
            var n = o.notes[slug];
            if (!s.notes[slug] && !Object.keys(s.notes).some(function (k) { return filename(k).toLowerCase() === slug.toLowerCase(); })) {
              s.notes[slug] = { slug: slug, body: n.body, created: n.updated || Date.now(), updated: n.updated || Date.now() };
            }
          });
          s.saved = true;
          return s;
        }
      }
    } catch (e) {}
    return seed();
  }

  function TryVault(host, hooks) {
    var vault = load();
    var route = { page: "note", slug: vault.notes[vault.last] ? vault.last : "Welcome" };
    var ui = { searching: false, query: "", tagFilter: [], closedFolders: new Set(), naming: null, editing: false, todoView: "list", calSel: dayKey(new Date()), calMonth: null, drawer: false, editingTodo: null, menu: null };
    var editor = null, saveTimer = 0, saveState = null, graphs = [], findState = null, mounted = false;

    /* ---------- persistence ---------- */
    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(vault)); vault.saved = true; return true; } catch (e) { return false; }
    }
    function note(slug) { return vault.notes[slug] || null; }
    function slugs() { return Object.keys(vault.notes); }
    function allFolders() {
      var set = new Set(vault.folders);
      slugs().forEach(function (s) { var f = folderOf(s); while (f) { set.add(f); f = folderOf(f); } });
      return Array.from(set).sort(function (a, b) { return a.localeCompare(b); });
    }
    function resolver() {
      var map = new Map();
      slugs().forEach(function (s) { map.set(filename(s).toLowerCase(), s); });
      slugs().forEach(function (s) { map.set(s.toLowerCase(), s); });
      return map;
    }
    function resolve(target) { return resolver().get(String(target).trim().toLowerCase()) || null; }
    function noteTags(slug) {
      var n = note(slug); if (!n) return [];
      var re = new RegExp(TAG_SOURCE, "g"), m, out = new Set();
      var prose = stripCode(n.body);
      while ((m = re.exec(prose))) out.add(m[2].toLowerCase());
      return Array.from(out).sort();
    }
    function allTags() {
      var count = new Map();
      slugs().forEach(function (s) { noteTags(s).forEach(function (t) { count.set(t, (count.get(t) || 0) + 1); }); });
      return Array.from(count.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    }

    /* ---------- mutations (lib/vault/mutations.ts) ---------- */
    function createNote(slug, body) {
      vault.notes[slug] = { slug: slug, body: body || "", created: Date.now(), updated: Date.now() };
      persist();
    }
    function createUnnamed(folder) {
      var name = "Unnamed";
      for (var c = 2; vault.notes[join(folder, name)]; c++) name = "Unnamed-" + c;
      var slug = join(folder, name);
      createNote(slug, "");
      ui.fresh = slug;
      go({ page: "note", slug: slug }, true);
    }
    function rewriteLinks(fromSlug, toSlug) {
      var from = [fromSlug.toLowerCase(), filename(fromSlug).toLowerCase()];
      var re = new RegExp(WIKILINK_SOURCE, "g");
      slugs().forEach(function (s) {
        var n = vault.notes[s];
        var next = n.body.replace(re, function (full, target, heading, alias) {
          if (from.indexOf(target.trim().toLowerCase()) < 0) return full;
          return "[[" + filename(toSlug) + (heading ? "#" + heading : "") + (alias ? "|" + alias : "") + "]]";
        });
        if (next !== n.body) { n.body = next; }
      });
    }
    function moveSlug(from, to) {
      if (from === to || vault.notes[to]) return false;
      vault.notes[to] = vault.notes[from]; vault.notes[to].slug = to; delete vault.notes[from];
      if (route.slug === from) route.slug = to;
      if (vault.last === from) vault.last = to;
      return true;
    }
    function renameNote(slug, raw) {
      var name = sanitize(raw); if (!name) return "That name will not work.";
      var next = join(folderOf(slug), name);
      if (next === slug) return null;
      if (vault.notes[next]) return "A note called “" + name + "” already exists.";
      moveSlug(slug, next); rewriteLinks(slug, next); persist();
      return null;
    }
    function moveNote(slug, into) {
      var next = join(into, filename(slug));
      if (!moveSlug(slug, next)) return;
      persist();
    }
    function moveFolder(path, into, newName) {
      var next = join(into, newName || filename(path));
      if (next === path || next.indexOf(path + "/") === 0) return;
      slugs().forEach(function (s) { if (s.indexOf(path + "/") === 0) moveSlug(s, next + s.slice(path.length)); });
      vault.folders = vault.folders.map(function (f) { return f === path ? next : f.indexOf(path + "/") === 0 ? next + f.slice(path.length) : f; });
      if (vault.folders.indexOf(next) < 0) vault.folders.push(next);
      persist();
    }
    function deleteFolder(path) {
      var parent = folderOf(path);
      slugs().forEach(function (s) { if (s.indexOf(path + "/") === 0) moveSlug(s, join(parent, s.slice(path.length + 1))); });
      vault.folders = vault.folders.filter(function (f) { return f !== path; }).map(function (f) { return f.indexOf(path + "/") === 0 ? join(parent, f.slice(path.length + 1)) : f; });
      persist();
    }
    function deleteNote(slug) { delete vault.notes[slug]; persist(); }
    function setBody(slug, body) {
      var n = note(slug); if (!n || n.body === body) return;
      n.body = body; n.updated = Date.now();
    }
    function toggleTodo(slug, index) {
      var n = note(slug); if (!n) return;
      var t = parseTodos(n.body)[index]; if (!t) return;
      n.body = n.body.slice(0, t.offset) + formatTodo(!t.done, t.text, t.due) + n.body.slice(t.offset + t.length);
      n.updated = Date.now(); persist();
    }
    function editTodo(slug, index, text, due) {
      var n = note(slug); if (!n) return;
      var t = parseTodos(n.body)[index]; if (!t) return;
      n.body = n.body.slice(0, t.offset) + formatTodo(t.done, text, due) + n.body.slice(t.offset + t.length);
      n.updated = Date.now(); persist();
    }

    /* ---------- markdown (NoteMarkdown + remark plugins) ---------- */
    function highlight(code, lang) {
      var KW = /\b(const|let|var|function|return|if|else|for|while|await|async|import|from|export|class|new|def|in|not|and|or|None|True|False|null|true|false|SELECT|FROM|WHERE|INSERT|UPDATE|INTO|VALUES)\b/g;
      var out = "", re = /(\/\/[^\n]*|#[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\b\d+(?:\.\d+)?\b)/g, last = 0, m;
      function words(s) { return esc(s).replace(KW, '<span class="tok-k">$1</span>'); }
      if (!lang) return esc(code);
      while ((m = re.exec(code))) {
        out += words(code.slice(last, m.index));
        var tok = m[0], cls = /^(\/\/|#)/.test(tok) ? (lang === "js" || lang === "ts" ? (tok[0] === "#" ? null : "c") : (tok[0] === "#" ? "c" : null)) : /^["']/.test(tok) ? "s" : "n";
        out += cls ? '<span class="tok-' + cls + '">' + esc(tok) + "</span>" : words(tok);
        last = m.index + tok.length;
      }
      return out + words(code.slice(last));
    }
    function inline(text, slug, todoIndex) {
      var keep = [];
      function hold(html) { keep.push(html); return "\u0000" + (keep.length - 1) + "\u0000"; }
      var t = text;
      t = t.replace(/`([^`]+)`/g, function (_, c) { return hold("<code>" + esc(c) + "</code>"); });
      t = t.replace(new RegExp(TODO_SOURCE, "g"), function (_, x, what, due) {
        var i = todoIndex ? todoIndex.next++ : -1;
        due = (due || "").trim() || null;
        var over = !x && isPast(due);
        return hold('<span class="todo ' + (x ? "todo-done" : "todo-open") + (over ? " todo-overdue" : "") + '"><span class="todo-box" role="checkbox" tabindex="0" aria-checked="' + (!!x) + '" data-todo="' + i + '" aria-label="' + esc(what.trim()) + '"></span><span class="todo-text">' + inlineBasic(what.trim()) + "</span>" + (due ? '<span class="todo-due">' + esc(formatDue(due)) + "</span>" : "") + "</span>");
      });
      t = t.replace(new RegExp(WIKILINK_SOURCE, "g"), function (_, target, heading, alias) {
        var to = resolve(target), label = esc((alias || target).trim());
        return hold(to ? '<a class="wikilink" data-note="' + esc(to) + '" tabindex="0">' + label + "</a>"
          : '<span class="wikilink-broken" title="No note found for &quot;' + esc(target.trim()) + '&quot;" data-missing="' + esc(target.trim()) + '">' + label + "</span>");
      });
      t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (_, label, href) { return hold('<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>"); });
      t = esc(t);
      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/(^|[^\w*])\*([^*\s][^*]*)\*(?=[^\w*]|$)/g, "$1<em>$2</em>");
      t = t.replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, "$1<em>$2</em>");
      t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
      t = t.replace(new RegExp(TAG_SOURCE, "g"), function (_, pre, tag) { return pre + hold('<a class="tag" data-tag="' + esc(tag.toLowerCase()) + '">#' + esc(tag) + "</a>"); });
      return t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return keep[+i]; });
    }
    function inlineBasic(text) { return esc(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); }
    function markdown(src, slug) {
      var lines = src.split("\n"), out = [], i = 0, m, todoIndex = { next: 0 };
      var n = note(slug);
      if (n && /^#\s+/.test(lines[0] || "") && lines[0].replace(/^#\s+/, "").trim().toLowerCase() === filename(slug).toLowerCase()) { lines.shift(); }
      function isBlock(l) { return /^(#{1,6}\s|```|>|\s*[-*+]\s+|\s*\d+\.\s+|---+\s*$|\|)/.test(l); }
      while (i < lines.length) {
        var l = lines[i];
        if ((m = /^```\s*(\w*)/.exec(l))) {
          var code = [], lang = m[1]; i++;
          while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
          i++;
          out.push('<div class="tv-code"><pre><code>' + highlight(code.join("\n"), lang) + '</code></pre><button type="button" class="tv-copy" data-copy>Copy</button></div>');
          continue;
        }
        if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push("<h" + m[1].length + ">" + inline(m[2], slug, todoIndex) + "</h" + m[1].length + ">"); i++; continue; }
        if (/^\s*$/.test(l)) { i++; continue; }
        if (/^---+\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
        if (/^\|/.test(l) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
          var cells = function (row) { return row.replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); };
          var head = cells(l); i += 2;
          var rows = [];
          while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
          out.push("<table><thead><tr>" + head.map(function (c) { return "<th>" + inline(c, slug, todoIndex) + "</th>"; }).join("") + "</tr></thead><tbody>" +
            rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c, slug, todoIndex) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>");
          continue;
        }
        if (/^>/.test(l)) {
          var q = [];
          while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
          out.push("<blockquote><p>" + inline(q.join(" "), slug, todoIndex) + "</p></blockquote>"); continue;
        }
        if (/^\s*[-*+]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
          var ordered = /^\s*\d+\./.test(l), items = [], re = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
          while (i < lines.length && re.test(lines[i])) items.push("<li>" + inline(lines[i++].replace(re, ""), slug, todoIndex) + "</li>");
          out.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>")); continue;
        }
        var para = [];
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlock(lines[i])) para.push(inline(lines[i++], slug, todoIndex));
        out.push("<p>" + para.join("<br>") + "</p>");
      }
      return out.join("\n");
    }

    /* ---------- links, backlinks, graph data ---------- */
    function renderInline(md) { return md.replace(new RegExp(WIKILINK_SOURCE, "g"), function (_, t, h, a) { return (a || t).trim(); }); }
    function occurrences(body) {
      var out = [];
      stripCode(body).split("\n").forEach(function (line) {
        var prose = line.replace(/^[>\s]*(?:[-*+] |\d+\. |#{1,6} )?/, "");
        var re = new RegExp(WIKILINK_SOURCE, "g"), m;
        while ((m = re.exec(prose))) {
          var before = renderInline(prose.slice(0, m.index)), after = renderInline(prose.slice(m.index + m[0].length));
          if (before.length > 80) before = "…" + before.slice(-80);
          if (after.length > 80) after = after.slice(0, 80) + "…";
          out.push({ target: m[1], text: (m[3] || m[1]).trim(), before: before, after: after });
        }
      });
      return out;
    }
    function backlinks(slug) {
      var out = [];
      slugs().sort(function (a, b) { return filename(a).localeCompare(filename(b)); }).forEach(function (s) {
        if (s === slug) return;
        var seen = new Set(), ctx = [];
        occurrences(vault.notes[s].body).forEach(function (o) {
          if (resolve(o.target) !== slug) return;
          var key = o.before + "|" + o.text + "|" + o.after;
          if (seen.has(key)) return; seen.add(key); ctx.push(o);
        });
        if (ctx.length) out.push({ slug: s, contexts: ctx });
      });
      return out;
    }
    function graphData(filterTags) {
      var nodes = [], links = [];
      var keep = slugs().filter(function (s) { return !filterTags || !filterTags.length || noteTags(s).some(function (t) { return filterTags.indexOf(t) >= 0; }); });
      keep.forEach(function (s) { nodes.push({ id: s, name: filename(s), group: "v" }); });
      keep.forEach(function (s) {
        occurrences(vault.notes[s].body).forEach(function (o) { var to = resolve(o.target); if (to && to !== s && keep.indexOf(to) >= 0) links.push([s, to]); });
      });
      return { nodes: nodes, links: links };
    }

    /* ---------- shell ---------- */
    host.innerHTML =
      '<div class="tv-scrim" data-act="drawer-close"></div>' +
      '<nav class="tv-side" data-part="side">' +
      '  <div class="tv-side-head" data-part="side-head"></div>' +
      '  <div class="tv-tree" data-part="tree"></div>' +
      '  <div class="tv-side-foot" data-part="side-foot"></div>' +
      "</nav>" +
      '<main class="tv-main" data-part="main">' +
      '  <div class="tv-page" data-part="page"></div>' +
      '  <div class="tv-footer" data-part="footer"></div>' +
      '  <div class="tv-mobile-bar" data-part="mobile-bar"></div>' +
      "</main>";
    var $ = function (part) { return host.querySelector('[data-part="' + part + '"]'); };
    var side = $("side"), sideHead = $("side-head"), tree = $("tree"), sideFoot = $("side-foot");
    var main = $("main"), page = $("page"), footer = $("footer"), mobileBar = $("mobile-bar");

    function phone() { return (host.clientWidth || (host.parentElement && host.parentElement.clientWidth) || 1024) < 768; }
    function sidebarWidth() { return phone() ? 0 : vault.settings.sidebarCollapsed ? 60 : 256; }
    function setSeams() {
      var p = phone(), w = sidebarWidth();
      function seam(el, value, ox, oy) {
        if (!el) return;
        if (value) el.dataset.seam = value; else el.removeAttribute("data-seam");
        if (ox != null) el.dataset.ox = ox; else el.removeAttribute("data-ox");
        if (oy != null) el.dataset.oy = oy; else el.removeAttribute("data-oy");
      }
      seam(side, p ? null : "right", null, 56);
      seam(sideHead, p ? null : "bottom", w, null);
      seam(sideFoot, p ? null : "top", w, null);
      seam(page.querySelector(".tv-head"), "bottom", 0, null);
      seam(footer, footer.classList.contains("open") ? "top" : null, null, null);
    }
    function relayout(ms) {
      setSeams();
      if (!hooks.rebuild) return;
      var until = performance.now() + (ms || 0);
      (function tick() { hooks.rebuild(true); if (performance.now() < until) requestAnimationFrame(tick); })();
    }

    /* ---------- sidebar head + search ---------- */
    function renderSideHead() {
      if (ui.searching) {
        sideHead.innerHTML = '<div class="tv-side-search"><input class="tv-input" type="search" placeholder="Search notes…" aria-label="Search notes" data-part="side-search" value="' + esc(ui.query) + '" spellcheck="false"></div>' +
          '<button class="tv-icon active" type="button" data-act="search" title="Search notes" aria-label="Search notes" aria-pressed="true">' + I.search + "</button>";
        var input = sideHead.querySelector("input");
        input.addEventListener("input", function () { ui.query = input.value; renderTree(); });
        input.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closeSearch(); } });
        return;
      }
      sideHead.innerHTML =
        '<button class="tv-logo" type="button" data-act="logo" title="' + (phone() ? "Close menu" : vault.settings.sidebarCollapsed ? "Expand sidebar" : "Minimise sidebar") + '" aria-label="' + (phone() ? "Close menu" : vault.settings.sidebarCollapsed ? "Expand sidebar" : "Minimise sidebar") + '">' + I.logo + "</button>" +
        '<div class="tv-head-acts">' +
        '<button class="tv-icon" type="button" data-act="new-note" title="New note" aria-label="New note">' + I.filePlus + "</button>" +
        '<button class="tv-icon' + (ui.naming && !ui.naming.into && ui.naming.rename == null ? " active" : "") + '" type="button" data-act="new-folder" title="New folder" aria-label="New folder">' + I.folderPlus + "</button>" +
        '<button class="tv-icon" type="button" data-act="search" title="Search notes" aria-label="Search notes">' + I.search + "</button>" +
        "</div>";
    }
    function openSearch() { ui.searching = true; renderSideHead(); renderTree(); var i = sideHead.querySelector("input"); if (i) i.focus(); }
    function closeSearch() { ui.searching = false; ui.query = ""; ui.tagFilter = []; renderSideHead(); renderTree(); }

    function searchResults() {
      var raw = ui.query.trim(), tags = ui.tagFilter.slice();
      var terms = raw.split(/\s+/).filter(function (w) {
        if (/^#\w/.test(w)) { tags.push(w.slice(1).toLowerCase()); return false; }
        return !!w;
      }).map(function (w) { return w.toLowerCase(); });
      if (!terms.length && !tags.length) return null;
      var content = vault.settings.searchMode === "content";
      return slugs().filter(function (s) {
        var nt = noteTags(s);
        if (tags.some(function (t) { return nt.indexOf(t) < 0; })) return false;
        var hay = (content ? vault.notes[s].body : filename(s)).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) >= 0; });
      }).sort(function (a, b) { return filename(a).localeCompare(filename(b)); }).map(function (s) {
        var snippet = null;
        if (content && terms.length) {
          var body = vault.notes[s].body, at = body.toLowerCase().indexOf(terms[0]);
          if (at >= 0) snippet = { before: body.slice(Math.max(0, at - 30), at).replace(/\s+/g, " "), match: body.slice(at, at + terms[0].length), after: body.slice(at + terms[0].length, at + terms[0].length + 60).replace(/\s+/g, " ") };
        }
        return { slug: s, snippet: snippet, terms: terms };
      });
    }
    function markTerms(text, terms) {
      var lower = text.toLowerCase(), marks = [];
      terms.forEach(function (t) { var at = lower.indexOf(t); if (at >= 0) marks.push([at, at + t.length]); });
      if (!marks.length) return esc(text);
      marks.sort(function (a, b) { return a[0] - b[0]; });
      var out = "", last = 0;
      marks.forEach(function (m) { if (m[0] < last) return; out += esc(text.slice(last, m[0])) + '<span class="tv-mark-text">' + esc(text.slice(m[0], m[1])) + "</span>"; last = m[1]; });
      return out + esc(text.slice(last));
    }

    /* ---------- tree (NoteTree.tsx) ---------- */
    function treeModel() {
      var rootF = { path: "", folders: new Map(), notes: [] };
      function folderNode(path) {
        if (!path) return rootF;
        var parent = folderNode(folderOf(path));
        if (!parent.folders.has(path)) parent.folders.set(path, { path: path, folders: new Map(), notes: [] });
        return parent.folders.get(path);
      }
      allFolders().forEach(folderNode);
      slugs().forEach(function (s) { folderNode(folderOf(s)).notes.push(s); });
      return rootF;
    }
    function namingRow(depth) {
      return '<div class="tv-naming" style="padding-left:' + (depth * 0.75 + 0.5) + 'rem">' + I.folderPlus +
        '<input class="tv-input" data-part="naming" placeholder="Folder name…" aria-label="' + (ui.naming && ui.naming.rename != null ? "Rename folder" : "New folder name") + '" spellcheck="false"></div>';
    }
    function renderBranch(f, depth) {
      var html = "<ul>";
      if (depth > 0) html += '<span class="tv-guide" style="left:' + ((depth - 1) * 0.75 + 0.875) + 'rem"></span>';
      Array.from(f.folders.values()).sort(function (a, b) { return filename(a.path).localeCompare(filename(b.path)); }).forEach(function (sub) {
        var open = !ui.closedFolders.has(sub.path);
        html += '<li><div class="tv-folder" data-folder="' + esc(sub.path) + '" draggable="true">' +
          '<button class="tv-row-btn" type="button" data-act="folder" style="padding-left:' + (depth * 0.75 + 0.5) + 'rem" aria-expanded="' + open + '">' +
          I.chevron.replace('class="tv-chev"', 'class="tv-chev' + (open ? " open" : "") + '"') + '<span class="name">' + esc(filename(sub.path)) + "</span></button>" +
          '<button class="tv-more" type="button" data-act="folder-menu" aria-label="Actions for ' + esc(filename(sub.path)) + '" aria-haspopup="menu">' + I.ellipsis + "</button></div>";
        if (ui.naming && ui.naming.rename === sub.path) html += namingRow(depth);
        if (open) {
          html += '<div class="tv-branch' + (ui.justOpened === sub.path ? "" : " still") + '"><div>';
          if (ui.naming && ui.naming.into === sub.path && ui.naming.rename == null) html += namingRow(depth + 1);
          html += renderBranch(sub, depth + 1) + "</div></div>";
        }
        html += "</li>";
      });
      f.notes.sort(function (a, b) { return filename(a).localeCompare(filename(b)); }).forEach(function (s) {
        var active = route.page === "note" && route.slug === s;
        html += '<li class="tv-note-row' + (active ? " active" : "") + '" data-note-row="' + esc(s) + '" draggable="true">' +
          '<button class="link" type="button" data-act="open" data-slug="' + esc(s) + '" style="padding-left:' + (depth * 0.75 + 1.5) + 'rem"' + (active ? ' aria-current="page"' : "") + '><span class="name">' + esc(filename(s)) + "</span></button>" +
          '<button class="tv-more" type="button" data-act="note-menu" aria-label="Actions for ' + esc(filename(s)) + '" aria-haspopup="menu">' + I.ellipsis + "</button></li>";
      });
      return html + "</ul>";
    }
    // Only touch the DOM when the tree really changed, so typing in a note leaves the sidebar alone.
    var treeHtml = null;
    function setTree(html) {
      if (html === treeHtml && !ui.naming) return false;
      treeHtml = html;
      tree.innerHTML = html;
      return true;
    }
    function renderTree() {
      if (ui.searching) {
        var mode = vault.settings.searchMode, tags = allTags(), res = searchResults();
        var html = '<div class="tv-search-tools">' + segmented("search-mode", ["titles", "content"], mode, "Search in") +
          (tags.length ? '<button type="button" class="tv-dd-trigger" data-act="tag-picker" aria-label="Filter by tag" aria-haspopup="menu">' + (ui.tagFilter.length ? "Tags (" + ui.tagFilter.length + ")" : "Tags") + I.chevron.replace('class="tv-chev"', 'class="tv-chev open"') + "</button>" : "") +
          (ui.tagFilter.length ? '<div class="tv-chips">' + ui.tagFilter.map(function (t) { return '<button type="button" data-act="untag" data-tag="' + esc(t) + '" aria-label="Remove tag filter ' + esc(t) + '">#' + esc(t) + " ×</button>"; }).join("") + "</div>" : "") +
          "</div>";
        if (!res) html += '<p class="tv-empty" style="padding:0">Type to search, or pick a tag…</p>';
        else if (!res.length) html += '<p class="tv-empty" style="padding:0">No matches</p>';
        else html += '<ul style="display:grid;gap:2px;list-style:none;margin:0;padding:0">' + res.map(function (r) {
          return '<li><button class="tv-result' + (route.slug === r.slug ? " active" : "") + '" type="button" data-act="open" data-slug="' + esc(r.slug) + '"><span class="t">' + markTerms(filename(r.slug), mode === "titles" ? r.terms : []) +
            (folderOf(r.slug) ? '<span class="f">' + esc(folderOf(r.slug)) + "</span>" : "") + "</span>" +
            (r.snippet ? '<span class="s">' + esc(r.snippet.before) + '<span class="tv-mark-text">' + esc(r.snippet.match) + "</span>" + esc(r.snippet.after) + "</span>" : "") + "</button></li>";
        }).join("") + "</ul>";
        setTree(html);
        return;
      }
      var html2 = "";
      if (ui.naming && !ui.naming.into && ui.naming.rename == null) html2 += namingRow(0);
      html2 += renderBranch(treeModel(), 0);
      ui.justOpened = null;
      if (!setTree(html2)) return;
      var naming = tree.querySelector('[data-part="naming"]');
      if (naming) {
        if (ui.naming.rename != null) naming.value = "";
        naming.focus();
        naming.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); submitNaming(naming.value); }
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); ui.naming = null; renderTree(); renderSideHead(); }
        });
        naming.addEventListener("blur", function () { setTimeout(function () { if (ui.naming) { ui.naming = null; renderTree(); renderSideHead(); } }, 0); });
      }
    }
    function submitNaming(raw) {
      var target = ui.naming; ui.naming = null;
      var name = sanitize(raw);
      if (name && target) {
        if (target.rename != null) moveFolder(target.rename, folderOf(target.rename), name);
        else { var path = join(target.into, name); if (vault.folders.indexOf(path) < 0) vault.folders.push(path); persist(); }
      }
      renderTree(); renderSideHead();
    }

    /* ---------- sidebar footer (SidebarFooter.tsx) ---------- */
    function renderSideFoot() {
      var p = route.page;
      sideFoot.innerHTML =
        '<div class="grp phone-hide"><button class="tv-icon' + (p === "graph" ? " active" : "") + '" type="button" data-act="go" data-page="graph" title="Graph" aria-label="Graph">' + I.graph + "</button>" +
        '<button class="tv-icon' + (p === "todos" ? " active" : "") + '" type="button" data-act="go" data-page="todos" title="Todos" aria-label="Todos">' + I.todo + "</button></div>";
      mobileBar.innerHTML =
        '<button class="tv-icon" type="button" data-act="drawer" aria-label="Menu">' + I.menu + "</button>" +
        '<button class="tv-icon" type="button" data-act="switcher" aria-label="Search">' + I.search + "</button>" +
        '<button class="tv-icon" type="button" data-act="new-note" aria-label="New note">' + I.filePlus + "</button>" +
        '<button class="tv-icon' + (p === "graph" ? " active" : "") + '" type="button" data-act="go" data-page="graph" aria-label="Graph">' + I.graph + "</button>" +
        '<button class="tv-icon' + (p === "todos" ? " active" : "") + '" type="button" data-act="go" data-page="todos" aria-label="Todos">' + I.todo + "</button>";
    }

    function segmented(name, options, value, label) {
      return '<div class="tv-seg" role="group" aria-label="' + esc(label) + '" data-seg="' + name + '">' + options.map(function (o) {
        return '<button type="button" data-act="seg" data-seg-name="' + name + '" data-value="' + o + '" aria-pressed="' + (o === value) + '">' + o + "</button>";
      }).join("") + "</div>";
    }

    /* ---------- pages ---------- */
    function pageHead(title, meta, actions, opts) {
      return '<header class="tv-head" data-seam="bottom"><div class="tv-head-in">' + title + (meta ? '<div class="tv-meta">' + meta + "</div>" : "") + "</div>" +
        (actions ? '<div class="tv-head-acts-r">' + actions + "</div>" : "") + "</header>";
    }
    function closeBtn() { return '<button class="tv-icon" type="button" data-act="close-vault" title="Close the try vault" aria-label="Close the try vault">' + I.close + "</button>"; }
    function noteCount(n) { return n === 1 ? "1 note" : n + " notes"; }

    function renderHome() {
      var list = slugs().sort(function (a, b) { return filename(a).localeCompare(filename(b)); });
      page.innerHTML = pageHead('<h1 class="tv-title">Notes</h1>', "<span class=\"date\">" + noteCount(list.length) + "</span>", closeBtn()) +
        '<div class="tv-scroll"><div class="tv-body"><ul class="tv-list">' + list.map(function (s) {
          var tags = noteTags(s);
          return '<li><button type="button" data-act="open" data-slug="' + esc(s) + '"><strong>' + esc(filename(s)) + "</strong>" + (tags.length ? '<span class="m">' + esc(tags.join(" · ")) + "</span>" : "") + "</button></li>";
        }).join("") + "</ul></div></div>";
    }
    function renderTag(tag) {
      var list = slugs().filter(function (s) { return noteTags(s).indexOf(tag) >= 0; }).sort(function (a, b) { return filename(a).localeCompare(filename(b)); });
      page.innerHTML = pageHead('<h1 class="tv-title">#' + esc(tag) + "</h1>", '<span class="date">' + noteCount(list.length) + "</span>", closeBtn()) +
        '<div class="tv-scroll"><div class="tv-body"><ul class="tv-list">' + list.map(function (s) {
          var other = noteTags(s).filter(function (t) { return t !== tag; }).map(function (t) { return "#" + t; }).join(" ");
          return '<li><button type="button" data-act="open" data-slug="' + esc(s) + '"><strong>' + esc(filename(s)) + "</strong>" + (other ? '<span class="m">' + esc(other) + "</span>" : "") + "</button></li>";
        }).join("") + "</ul></div></div>";
    }

    function saveStatusHtml() {
      if (!saveState) return "";
      return '<span class="tv-save ' + saveState + '"><i></i>' + (saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Not saved") + "</span>";
    }
    function renderNote() {
      var slug = route.slug, n = note(slug);
      if (!n) {
        page.innerHTML = pageHead('<h1 class="tv-title">Not found</h1>', "", closeBtn()) + '<div class="tv-scroll"><div class="tv-body"><p>There is no note at “' + esc(slug) + "”.</p></div></div>";
        return;
      }
      vault.last = slug;
      var tags = noteTags(slug);
      var title = ui.editing
        ? (ui.renaming ? '<input class="tv-title-input" data-part="title-input" aria-label="Note title" value="' + esc(filename(slug)) + '" spellcheck="false">'
          : '<button class="tv-title-btn" type="button" data-act="rename" title="Rename note"><h1 class="tv-title">' + esc(filename(slug)) + "</h1></button>")
        : '<h1 class="tv-title">' + esc(filename(slug)) + "</h1>";
      var meta = '<span class="date">' + longDate(n.created) + "</span>" + tags.map(function (t) { return '<button class="tv-pill" type="button" data-act="tag" data-tag="' + esc(t) + '">#' + esc(t) + "</button>"; }).join("") + '<span data-part="save">' + saveStatusHtml() + "</span>";
      var actions = '<button class="tv-icon" type="button" data-act="edit" aria-pressed="' + ui.editing + '" title="' + (ui.editing ? "Reading view" : "Edit note") + '" aria-label="' + (ui.editing ? "Reading view" : "Edit note") + '">' + I.pencil + "</button>" +
        '<button class="tv-icon" type="button" data-act="note-actions" aria-label="Note actions" aria-haspopup="menu">' + I.ellipsis + "</button>" + closeBtn();
      if (ui.editing) {
        page.innerHTML = pageHead(title, meta, actions) + '<div class="tv-scroll" data-part="scroll"><article class="tv-article"><div class="tv-editor try-cm" data-part="editor"></div></article></div>';
        mountEditor();
        var ti = page.querySelector('[data-part="title-input"]');
        if (ti) {
          ti.focus(); if (ui.fresh === slug) ti.select();
          ti.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); ti.blur(); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); ui.renaming = false; ti.value = filename(slug); ti.blur(); }
          });
          ti.addEventListener("blur", function () {
            if (!ui.renaming) { renderPageHeadOnly(); return; }
            ui.renaming = false;
            flushSave();
            var error = renameNote(slug, ti.value);
            if (error) { toast(error); }
            ui.fresh = null;
            renderTree(); renderPageHeadOnly();
          });
        }
        return;
      }
      var backs = vault.settings.showBacklinks ? backlinks(slug) : [];
      var neighbours = graphNeighbourhood(slug);
      page.innerHTML = pageHead(title, meta, actions) +
        '<div class="tv-scroll" data-part="scroll"><article class="tv-article"><div class="tv-prose">' + markdown(n.body, slug) + "</div>" +
        (vault.settings.showGraph && neighbours.nodes.length > 1 ? '<section class="tv-note-foot"><h2 class="tv-h2">Graph</h2><div class="tv-local-graph"><canvas data-part="local-graph" aria-label="Notes around this one"></canvas></div></section>' : "") +
        (backs.length ? '<footer class="tv-note-foot"><h2 class="tv-h2">Linked from</h2><ul class="tv-backs">' + backs.map(function (b) {
          return '<li><button type="button" data-act="open" data-slug="' + esc(b.slug) + '">' + esc(filename(b.slug)) + "</button><ul>" + b.contexts.map(function (c) {
            return "<li>" + esc(c.before) + '<span class="tv-mark-text">' + esc(c.text) + "</span>" + esc(c.after) + "</li>";
          }).join("") + "</ul></li>";
        }).join("") + "</ul></footer>" : "") +
        "</article></div>";
      var canvas = page.querySelector('[data-part="local-graph"]');
      if (canvas && hooks.Graph) {
        graphs.push(hooks.Graph(canvas, neighbours, { overscan: 1, wheel: "modifier", controls: false, focusId: slug, onOpen: function (node) { go({ page: "note", slug: node.id }); } }));
      }
    }
    function renderPageHeadOnly() {
      if (route.page !== "note") return;
      var keepScroll = page.querySelector('[data-part="scroll"]');
      var head = page.querySelector(".tv-head");
      if (!head || !note(route.slug)) { render(); return; }
      var tmp = document.createElement("div");
      var editorEl = page.querySelector('[data-part="editor"]');
      var savedEditor = editorEl;
      // Re-render just the header so the editor keeps its state.
      var html = (function () {
        var slug = route.slug, n = note(slug), tags = noteTags(slug);
        var title = ui.editing ? '<button class="tv-title-btn" type="button" data-act="rename" title="Rename note"><h1 class="tv-title">' + esc(filename(slug)) + "</h1></button>" : '<h1 class="tv-title">' + esc(filename(slug)) + "</h1>";
        var meta = '<span class="date">' + longDate(n.created) + "</span>" + tags.map(function (t) { return '<button class="tv-pill" type="button" data-act="tag" data-tag="' + esc(t) + '">#' + esc(t) + "</button>"; }).join("") + '<span data-part="save">' + saveStatusHtml() + "</span>";
        var actions = '<button class="tv-icon" type="button" data-act="edit" aria-pressed="' + ui.editing + '" title="' + (ui.editing ? "Reading view" : "Edit note") + '" aria-label="' + (ui.editing ? "Reading view" : "Edit note") + '">' + I.pencil + "</button>" +
          '<button class="tv-icon" type="button" data-act="note-actions" aria-label="Note actions" aria-haspopup="menu">' + I.ellipsis + "</button>" + closeBtn();
        return pageHead(title, meta, actions);
      })();
      tmp.innerHTML = html;
      head.replaceWith(tmp.firstChild);
      setSeams();
      void keepScroll; void savedEditor;
    }
    function graphNeighbourhood(slug) {
      var all = graphData(), ids = new Set([slug]);
      all.links.forEach(function (l) { if (l[0] === slug) ids.add(l[1]); if (l[1] === slug) ids.add(l[0]); });
      return { nodes: all.nodes.filter(function (n) { return ids.has(n.id); }), links: all.links.filter(function (l) { return ids.has(l[0]) && ids.has(l[1]); }) };
    }

    /* ---------- editor ---------- */
    var editorLoad = null;
    function loadEditor() {
      if (window.ZenoteEditor) return Promise.resolve(window.ZenoteEditor);
      if (editorLoad) return editorLoad;
      editorLoad = new Promise(function (resolveLoad) {
        var base = hooks.assetBase || "assets/";
        if (!document.querySelector('link[data-try-editor]')) {
          var link = document.createElement("link"); link.rel = "stylesheet"; link.href = base + "try-editor.css"; link.dataset.tryEditor = "1"; document.head.appendChild(link);
        }
        var script = document.createElement("script"); script.src = base + "try-editor.js";
        script.onload = function () { resolveLoad(window.ZenoteEditor || null); };
        script.onerror = function () { resolveLoad(null); };
        document.head.appendChild(script);
      });
      return editorLoad;
    }
    function mountEditor() {
      var el = page.querySelector('[data-part="editor"]'), slug = route.slug, n = note(slug);
      destroyEditor();
      function onChange(text) {
        setBody(slug, text);
        saveState = "saving"; updateSave();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () { saveState = persist() ? "saved" : "error"; updateSave(); refreshMeta(); renderTree(); }, 300);
      }
      loadEditor().then(function (Z) {
        if (!el.isConnected || route.slug !== slug || !ui.editing) return;
        if (Z) {
          editor = Z.create(el, {
            doc: n.body,
            onChange: onChange,
            titles: function () { return slugs().map(filename).sort(); },
            exists: function (t) { return !!resolve(t); },
            onNavigate: function (t) { var to = resolve(t); if (to) go({ page: "note", slug: to }); },
            vim: !!vault.settings.vimMode
          });
          if (!ui.renaming) editor.focus();
        } else {
          el.innerHTML = '<textarea aria-label="Note text" spellcheck="false"></textarea>';
          var ta = el.querySelector("textarea"); ta.value = n.body;
          ta.addEventListener("input", function () { onChange(ta.value); });
          editor = { focus: function () { ta.focus(); }, destroy: function () {}, refresh: function () {} };
          if (!ui.renaming) ta.focus();
        }
      });
    }
    function destroyEditor() { if (editor) { try { editor.destroy(); } catch (e) {} editor = null; } }
    function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; saveState = persist() ? "saved" : "error"; } }
    function updateSave() { var s = page.querySelector('[data-part="save"]'); if (s) s.innerHTML = saveStatusHtml(); }
    function refreshMeta() {
      if (route.page !== "note") return;
      var meta = page.querySelector(".tv-meta"); if (!meta || !note(route.slug)) return;
      meta.querySelectorAll(".tv-pill").forEach(function (p) { p.remove(); });
      var save = meta.querySelector('[data-part="save"]');
      noteTags(route.slug).forEach(function (t) {
        var b = document.createElement("button"); b.className = "tv-pill"; b.type = "button"; b.dataset.act = "tag"; b.dataset.tag = t; b.textContent = "#" + t;
        meta.insertBefore(b, save);
      });
    }

    /* ---------- todos page (TodosView.tsx) ---------- */
    function vaultTodos() {
      var out = [];
      slugs().forEach(function (s) { parseTodos(vault.notes[s].body).forEach(function (t) { t.slug = s; out.push(t); }); });
      return out.sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        var l = dueDate(a.due), r = dueDate(b.due);
        if (l && r) return l - r; if (l) return -1; if (r) return 1;
        return a.text.localeCompare(b.text);
      });
    }
    function group(t, now) {
      if (t.done) return "Done";
      var d = dueDate(t.due); if (!d) return "No date";
      var days = Math.round((startOfDay(d) - startOfDay(now)) / 864e5);
      if (isPast(t.due, now) && days <= 0) return days < 0 || hasTime(t.due) ? "Overdue" : "Today";
      if (days <= 0) return "Today";
      if (days <= 7) return "Soon";
      return "Later";
    }
    function todoRow(t) {
      var key = t.slug + ":" + t.index;
      if (ui.editingTodo === key) {
        var d = (t.due || "").split("T");
        return '<li data-todo-key="' + esc(key) + '"><button class="tv-check" type="button" role="checkbox" aria-checked="' + t.done + '" data-act="todo-toggle" data-slug="' + esc(t.slug) + '" data-index="' + t.index + '"><i></i></button>' +
          '<div class="tv-todo-main tv-todo-edit"><input class="tv-input" data-part="todo-text" value="' + esc(t.text) + '" aria-label="Todo">' +
          '<div class="r"><input class="tv-input" type="date" data-part="todo-date" value="' + esc(d[0] || "") + '" aria-label="Date"><input class="tv-input" type="time" data-part="todo-time" value="' + esc(d[1] || "") + '" aria-label="Time"' + (d[0] ? "" : " disabled") + ">" +
          '<button class="tv-btn accent xs" type="button" data-act="todo-save" data-slug="' + esc(t.slug) + '" data-index="' + t.index + '">Save</button><button class="tv-btn xs" type="button" data-act="todo-cancel">Cancel</button></div></div></li>';
      }
      var over = !t.done && isPast(t.due);
      return '<li><button class="tv-check" type="button" role="checkbox" aria-checked="' + t.done + '" aria-label="' + esc(t.text) + '" data-act="todo-toggle" data-slug="' + esc(t.slug) + '" data-index="' + t.index + '"><i></i></button>' +
        '<div class="tv-todo-main"><button class="tv-todo-text' + (t.done ? " done" : "") + '" type="button" data-act="todo-edit" data-key="' + esc(key) + '">' + esc(t.text) + "</button>" +
        '<div class="tv-todo-meta">' + (t.due ? '<span class="' + (over ? "over" : "") + '">' + esc(formatDue(t.due)) + "</span>" : "") +
        '<button type="button" data-act="open" data-slug="' + esc(t.slug) + '">' + esc(filename(t.slug)) + "</button></div></div></li>";
    }
    function renderTodos() {
      var todos = vaultTodos(), now = new Date(), open = todos.filter(function (t) { return !t.done; }).length;
      var body = segmented("todo-view", ["list", "calendar"], ui.todoView, "Todo view").replace('class="tv-seg"', 'class="tv-seg md" style="width:14rem"') +
        '<div class="tv-composer"><i aria-hidden="true"></i><div class="fields"><input class="tv-input" data-part="compose-text" placeholder="Add a todo…" aria-label="Add a todo">' +
        '<div class="more" data-part="compose-more" hidden><input class="tv-input" type="date" data-part="compose-date" aria-label="Date"><input class="tv-input" type="time" data-part="compose-time" aria-label="Time" disabled>' +
        '<button class="tv-btn accent" type="button" data-act="compose-add" disabled>Add</button></div></div></div>';
      if (!todos.length) {
        body += '<p class="tv-muted" style="margin-top:32px;font-size:14px">Nothing yet. Add one above, or write !![call the bank][2026-09-11] in any note and it turns up here.</p>';
      } else if (ui.todoView === "list") {
        var groups = { Overdue: [], Today: [], Soon: [], Later: [], "No date": [], Done: [] };
        todos.forEach(function (t) { groups[group(t, now)].push(t); });
        ["Overdue", "Today", "Soon", "Later", "No date"].forEach(function (g) {
          if (!groups[g].length) return;
          body += '<section class="tv-todo-group"><h2 class="tv-h2">' + g + '</h2><ul class="tv-todos">' + groups[g].map(todoRow).join("") + "</ul></section>";
        });
        if (groups.Done.length) {
          body += '<details class="tv-done"' + (ui.doneOpen ? " open" : "") + ' data-part="done"><summary>' + I.chevron + "Done<b>" + groups.Done.length + '</b></summary><ul class="tv-todos">' + groups.Done.map(todoRow).join("") + "</ul></details>";
        }
      } else {
        var month = ui.calMonth || (function () { var d = dueDate(ui.calSel) || now; return new Date(d.getFullYear(), d.getMonth(), 1); })();
        ui.calMonth = month;
        var first = new Date(month.getFullYear(), month.getMonth(), 1), shift = (first.getDay() + 6) % 7, start = addDays(first, -shift);
        var byDay = {};
        todos.forEach(function (t) { var d = dueDate(t.due); if (!d) return; var k = dayKey(d); (byDay[k] = byDay[k] || []).push(t); });
        body += '<div class="tv-cal-head"><b>' + MONTHS_LONG[month.getMonth()] + " " + month.getFullYear() + '</b><div class="nav"><button class="tv-icon" type="button" data-act="cal-prev" aria-label="Previous month" style="transform:rotate(180deg)">' + I.chevron + '</button><button class="tv-icon" type="button" data-act="cal-next" aria-label="Next month">' + I.chevron + "</button></div></div>";
        body += '<div class="tv-cal">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function (w) { return '<span class="wd">' + w + "</span>"; }).join("");
        for (var c = 0; c < 42; c++) {
          var day = addDays(start, c), k = dayKey(day), list = byDay[k] || [];
          var dot = !list.length ? "" : list.every(function (t) { return t.done; }) ? "all" : "open";
          var cls = (k === ui.calSel ? "sel" : k === dayKey(now) ? "today" : "") + (day.getMonth() !== month.getMonth() ? " out" : "");
          body += '<button type="button" class="' + cls + '" data-act="cal-day" data-day="' + k + '">' + day.getDate() + '<i class="' + dot + '"></i></button>';
        }
        body += "</div>";
        var sel = byDay[ui.calSel] || [];
        body += sel.length ? '<ul class="tv-todos" style="margin-top:12px">' + sel.map(todoRow).join("") + "</ul>" : '<p class="tv-cal-empty">Nothing due this day.</p>';
        var undated = todos.filter(function (t) { return !t.due; });
        if (undated.length) body += '<section class="tv-todo-group"><h2 class="tv-h2">No date</h2><ul class="tv-todos">' + undated.map(todoRow).join("") + "</ul></section>";
      }
      page.innerHTML = pageHead('<h1 class="tv-title">Todos</h1>', '<span class="date">' + open + " open</span>", closeBtn()) + '<div class="tv-scroll" data-part="scroll"><div class="tv-body">' + body + "</div></div>";
      wireTodoPage();
    }
    function wireTodoPage() {
      var text = page.querySelector('[data-part="compose-text"]'), more = page.querySelector('[data-part="compose-more"]');
      var date = page.querySelector('[data-part="compose-date"]'), time = page.querySelector('[data-part="compose-time"]'), add = page.querySelector('[data-act="compose-add"]');
      function sync() { more.hidden = !(document.activeElement === text || text.value || date.value); time.disabled = !date.value; add.disabled = !text.value.trim(); }
      function submit() {
        var v = text.value.trim(); if (!v) return;
        var due = date.value ? date.value + (time.value ? "T" + time.value : "") : null;
        var inbox = vault.notes[INBOX];
        if (!inbox) createNote(INBOX, "");
        inbox = vault.notes[INBOX];
        var line = formatTodo(false, v, due), trimmed = inbox.body.replace(/\s+$/, "");
        inbox.body = trimmed === "" ? line + "\n" : trimmed + "\n" + line + "\n";
        inbox.updated = Date.now(); persist();
        renderTodos(); renderTree();
        var again = page.querySelector('[data-part="compose-text"]'); if (again) again.focus();
      }
      [text, date, time].forEach(function (el) { el.addEventListener("input", sync); el.addEventListener("focus", sync); el.addEventListener("blur", function () { setTimeout(sync, 150); }); });
      text.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submit(); }
        if (e.key === "Escape") { e.stopPropagation(); text.value = ""; date.value = ""; time.value = ""; text.blur(); sync(); }
      });
      add.addEventListener("click", submit);
      var done = page.querySelector('[data-part="done"]');
      if (done) done.addEventListener("toggle", function () { ui.doneOpen = done.open; });
      var et = page.querySelector('[data-part="todo-text"]');
      if (et) {
        et.focus();
        var ed = page.querySelector('[data-part="todo-date"]'), etm = page.querySelector('[data-part="todo-time"]');
        ed.addEventListener("input", function () { etm.disabled = !ed.value; });
        [et, ed, etm].forEach(function (el) {
          el.addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); page.querySelector('[data-act="todo-save"]').click(); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); ui.editingTodo = null; renderTodos(); }
          });
        });
      }
    }

    /* ---------- graph page (GraphRoute) ---------- */
    function renderGraph() {
      var data = graphData(ui.graphTags);
      var all = graphData();
      page.innerHTML = pageHead('<h1 class="tv-title">Graph</h1>', '<span class="date">' + noteCount(data.nodes.length) + " · " + data.links.length + (data.links.length === 1 ? " link" : " links") + "</span>", closeBtn()) +
        '<div class="tv-graph-page"><canvas data-part="graph" aria-label="The graph of this vault"></canvas>' +
        '<div class="tv-gtools"><div style="position:relative"><input class="tv-input" type="search" placeholder="Search notes" data-part="gsearch" aria-label="Search notes" spellcheck="false"><ul class="tv-gresults" data-part="gresults" hidden></ul></div>' +
        (allTags().length ? '<button class="tv-btn' + ((ui.graphTags || []).length ? " on" : "") + '" type="button" data-act="graph-filter" aria-haspopup="menu">' + ((ui.graphTags || []).length ? "Filter (" + ui.graphTags.length + ")" : "Filter") + "</button>" : "") +
        '<button class="tv-btn" type="button" data-zoom="in" aria-label="Zoom in">+</button><button class="tv-btn" type="button" data-zoom="out" aria-label="Zoom out">−</button><button class="tv-btn" type="button" data-zoom="reset">Reset</button></div>' +
        '<div class="focus-chip" data-part="gchip" hidden></div></div>';
      void all;
      if (!hooks.Graph) return;
      var chipEl = page.querySelector('[data-part="gchip"]'), g = null;
      g = hooks.Graph(page.querySelector('[data-part="graph"]'), data, {
        overscan: 1, wheel: "always",
        onOpen: function (node) { go({ page: "note", slug: node.id }); },
        onFocus: hooks.chip(chipEl, function () { return g; })
      });
      graphs.push(g);
      hooks.wireGraph(g, { input: page.querySelector('[data-part="gsearch"]'), results: page.querySelector('[data-part="gresults"]'), buttons: page.querySelectorAll(".tv-gtools [data-zoom]") });
      ui.graph = g;
    }

    /* ---------- render + routing (PageFade) ---------- */
    function destroyGraphs() { graphs.forEach(function (g) { try { g.destroy(); } catch (e) {} }); graphs = []; ui.graph = null; }
    function render() {
      destroyGraphs();
      if (route.page !== "note") destroyEditor();
      closeMenu();
      host.classList.toggle("collapsed", !phone() && !!vault.settings.sidebarCollapsed);
      renderSideHead(); renderTree(); renderSideFoot();
      if (route.page === "note") renderNote();
      else if (route.page === "home") renderHome();
      else if (route.page === "tag") renderTag(route.tag);
      else if (route.page === "todos") renderTodos();
      else if (route.page === "graph") renderGraph();
      if (findState) runFind(findState.input.value);
      setSeams();
      if (hooks.rebuild) hooks.rebuild(true);
    }
    function go(next, edit) {
      flushSave();
      var same = next.page === route.page && next.slug === route.slug && next.tag === route.tag;
      if (route.page === "note" && route.slug !== next.slug) destroyEditor();
      route = next;
      if (next.page === "note") {
        var n = note(next.slug);
        ui.editing = !!edit || (!!n && (vault.settings.openInEditMode || n.body.trim() === ""));
        ui.renaming = !!edit && ui.fresh === next.slug;
      }
      saveState = null;
      ui.drawer = false; host.classList.remove("drawer");
      persist();
      if (same || hooks.reduce) { render(); return; }
      page.classList.add("fading");
      setTimeout(function () { render(); page.classList.remove("fading"); }, 110);
    }

    /* ---------- menus + modals ---------- */
    function closeMenu() { if (ui.menu) { ui.menu.el.remove(); if (ui.menu.trigger) ui.menu.trigger.setAttribute("aria-expanded", "false"); ui.menu = null; } }
    function openMenu(trigger, items, align) {
      closeMenu();
      var el = document.createElement("div");
      el.className = "tv-menu"; el.setAttribute("role", "menu");
      el.innerHTML = items.map(function (it, i) { return it.note ? '<div class="note">' + esc(it.note) + "</div>" : '<button type="button" role="menuitem" data-i="' + i + '"' + (it.danger ? ' class="danger"' : it.on ? ' class="on"' : "") + ">" + esc(it.label) + "</button>"; }).join("");
      host.appendChild(el);
      var hr = host.getBoundingClientRect(), tr = trigger.getBoundingClientRect();
      var left = align === "left" ? tr.left - hr.left : tr.left - hr.left + tr.width / 2 - el.offsetWidth / 2;
      if (align === "right") left = tr.right - hr.left - el.offsetWidth;
      left = Math.max(8, Math.min(left, host.clientWidth - el.offsetWidth - 8));
      var top = tr.bottom - hr.top + 4;
      if (top + el.offsetHeight > host.clientHeight - 8) top = tr.top - hr.top - el.offsetHeight - 4;
      el.style.left = left + "px"; el.style.top = top + "px";
      trigger.setAttribute("aria-expanded", "true");
      el.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-i]"); if (!b) return;
        var it = items[+b.dataset.i];
        if (!it.keep) closeMenu();
        it.run(b);
      });
      ui.menu = { el: el, trigger: trigger };
      var firstBtn = el.querySelector("button"); if (firstBtn) firstBtn.focus({ preventScroll: true });
    }
    function modal(html, opts) {
      closeModal();
      var wrap = document.createElement("div");
      wrap.className = "tv-modal"; wrap.dataset.part = "modal";
      wrap.innerHTML = '<div class="tv-modal-panel' + (opts && opts.small ? " sm" : "") + '" role="dialog" aria-modal="true">' +
        '<span class="tv-diamond" style="left:0;top:0"></span><span class="tv-diamond" style="left:100%;top:0"></span><span class="tv-diamond" style="left:0;top:100%"></span><span class="tv-diamond" style="left:100%;top:100%"></span>' + html + "</div>";
      wrap.addEventListener("mousedown", function (e) { if (e.target === wrap) closeModal(); });
      host.appendChild(wrap);
      ui.modal = wrap;
      return wrap;
    }
    function closeModal() { if (ui.modal) { ui.modal.remove(); ui.modal = null; } }
    function toast(text) {
      modal('<h2>Can’t do that</h2><p style="margin:12px 0 0;opacity:.7">' + esc(text) + '</p><div class="tv-modal-acts"><button class="tv-btn" type="button" data-act="modal-close">OK</button></div>', { small: true });
    }

    function fuzzy(q, text) {
      var idx = [], score = 0, from = 0;
      for (var i = 0; i < q.length; i++) {
        var at = text.indexOf(q[i], from); if (at < 0) return null;
        if (at === idx[idx.length - 1] + 1) score += 2; else if (at === 0 || /[\s/_-]/.test(text[at - 1])) score += 3; else score += 1;
        idx.push(at); from = at + 1;
      }
      return { score: score, idx: idx };
    }
    function switcher() {
      if (ui.modal && ui.modal.dataset.kind === "switcher") { closeModal(); return; }
      var m = modal('<h2>Jump to note</h2><input class="tv-input" type="search" placeholder="Jump to note…" aria-label="Jump to note" data-part="sw-input" spellcheck="false" autocomplete="off"><ul class="tv-modal-list" data-part="sw-list"></ul>');
      m.dataset.kind = "switcher";
      var input = m.querySelector('[data-part="sw-input"]'), list = m.querySelector('[data-part="sw-list"]'), results = [], active = 0;
      function update() {
        var q = input.value.replace(/\s+/g, "").toLowerCase();
        var names = slugs().map(function (s) { return { slug: s, title: filename(s) }; });
        if (!q) results = names.sort(function (a, b) { return a.title.localeCompare(b.title); }).slice(0, 8).map(function (n) { n.idx = []; return n; });
        else results = names.map(function (n) { var f = fuzzy(q, n.title.toLowerCase()); if (!f) return null; n.idx = f.idx; n.score = f.score; return n; }).filter(Boolean)
          .sort(function (a, b) { return b.score - a.score || a.title.localeCompare(b.title); }).slice(0, 8);
        active = Math.min(active, Math.max(results.length - 1, 0));
        list.innerHTML = results.length ? results.map(function (r, i) {
          var t = r.title.split("").map(function (ch, j) { return r.idx.indexOf(j) >= 0 ? '<span class="tv-mark-text">' + esc(ch) + "</span>" : esc(ch); }).join("");
          return '<li><button type="button" class="tv-result' + (i === active ? " active" : "") + '" data-i="' + i + '"><span class="t">' + t + (folderOf(r.slug) ? '<span class="f">' + esc(folderOf(r.slug)) + "</span>" : "") + "</span></button></li>";
        }).join("") : '<li class="tv-empty">No matches</li>';
      }
      function pick(i) { var r = results[i]; if (!r) return; closeModal(); go({ page: "note", slug: r.slug }); }
      input.addEventListener("input", function () { active = 0; update(); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!results.length) return; active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length; update(); }
        else if (e.key === "Enter") { e.preventDefault(); pick(active); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeModal(); }
      });
      list.addEventListener("mousedown", function (e) { var b = e.target.closest("[data-i]"); if (b) { e.preventDefault(); pick(+b.dataset.i); } });
      list.addEventListener("mousemove", function (e) { var b = e.target.closest("[data-i]"); if (b && +b.dataset.i !== active) { active = +b.dataset.i; update(); } });
      update(); input.focus();
    }
    function moveModal(kind, path) {
      var from = folderOf(path);
      var dest = [""].concat(allFolders()).filter(function (into) {
        if (into === from) return false;
        if (kind !== "folder") return true;
        return into !== path && into.indexOf(path + "/") !== 0;
      });
      var m = modal("<h2>Move “" + esc(filename(path)) + "” to…</h2><ul class=\"tv-modal-list auto\">" + (dest.length ? dest.map(function (d) { return '<li><button class="tv-result" type="button" data-into="' + esc(d) + '"><span class="t">' + esc(d || "Vault root") + "</span></button></li>"; }).join("") : '<li class="tv-empty">Nowhere else to go</li>') + "</ul>");
      m.addEventListener("click", function (e) {
        var b = e.target.closest("[data-into]"); if (!b) return;
        closeModal();
        if (kind === "folder") moveFolder(path, b.dataset.into); else moveNote(path, b.dataset.into);
        render();
      });
    }
    function confirmModal(title, text, label, run) {
      var m = modal("<h2>" + esc(title) + '</h2><p style="margin:12px 0 0;opacity:.8">' + esc(text) + '</p><div class="tv-modal-acts"><button class="tv-btn" type="button" data-act="modal-close">Cancel</button><button class="tv-btn danger" type="button" data-part="confirm">' + esc(label) + "</button></div>", { small: true });
      m.querySelector('[data-part="confirm"]').addEventListener("click", function () { closeModal(); run(); });
      m.querySelector('[data-part="confirm"]').focus();
    }

    /* ---------- find in page (FindBar.tsx) ---------- */
    function openFind() {
      if (route.page !== "note") return;
      if (!findState) {
        footer.innerHTML = '<div class="tv-find"><input class="tv-input" type="search" placeholder="Find in page…" aria-label="Find in page…" data-part="find" spellcheck="false"><span class="count" data-part="find-count"></span>' +
          '<button class="tv-icon" type="button" data-act="find-prev" aria-label="Previous match" style="transform:rotate(-90deg)">' + I.chevron + '</button><button class="tv-icon" type="button" data-act="find-next" aria-label="Next match" style="transform:rotate(90deg)">' + I.chevron + '</button><button class="tv-icon" type="button" data-act="find-close" aria-label="Close">' + I.close + "</button></div>";
        var input = footer.querySelector('[data-part="find"]');
        findState = { input: input, ranges: [], current: 0 };
        input.addEventListener("input", function () { findState.current = 0; runFind(input.value); });
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeFind(); }
        });
        footer.classList.add("open");
        relayout(140);
      }
      findState.input.focus(); findState.input.select();
    }
    function runFind(q) {
      if (!findState) return;
      var count = footer.querySelector('[data-part="find-count"]');
      findState.ranges = [];
      q = (q || "").toLowerCase();
      if (q) {
        var scope = page.querySelector(".tv-scroll") || page;
        var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT), n;
        while ((n = walker.nextNode())) {
          var text = n.nodeValue.toLowerCase(), at = text.indexOf(q);
          while (at >= 0) { var r = document.createRange(); r.setStart(n, at); r.setEnd(n, at + q.length); findState.ranges.push(r); at = text.indexOf(q, at + q.length); }
        }
      }
      if (findState.current >= findState.ranges.length) findState.current = 0;
      paintFind();
      count.textContent = q ? (findState.ranges.length ? findState.current + 1 + " of " + findState.ranges.length : "No matches") : "";
      footer.querySelectorAll('[data-act="find-prev"],[data-act="find-next"]').forEach(function (b) { b.disabled = !findState.ranges.length; });
    }
    function paintFind() {
      if (!window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
      CSS.highlights.delete("tv-find-match"); CSS.highlights.delete("tv-find-current");
      if (!findState || !findState.ranges.length) return;
      CSS.highlights.set("tv-find-match", new Highlight(...findState.ranges));
      var cur = findState.ranges[findState.current];
      CSS.highlights.set("tv-find-current", new Highlight(cur));
      var scroll = page.querySelector(".tv-scroll"), rect = cur.getBoundingClientRect();
      if (scroll) { var sr = scroll.getBoundingClientRect(); scroll.scrollTop += rect.top - sr.top - sr.height / 2; }
    }
    function stepFind(d) {
      if (!findState || !findState.ranges.length) return;
      findState.current = (findState.current + d + findState.ranges.length) % findState.ranges.length;
      paintFind();
      footer.querySelector('[data-part="find-count"]').textContent = findState.current + 1 + " of " + findState.ranges.length;
    }
    function closeFind() {
      if (!findState) return;
      findState = null;
      if (window.CSS && CSS.highlights) { CSS.highlights.delete("tv-find-match"); CSS.highlights.delete("tv-find-current"); }
      footer.classList.remove("open");
      relayout(140);
      setTimeout(function () { if (!findState) footer.innerHTML = ""; }, 120);
    }

    /* ---------- events ---------- */
    host.addEventListener("click", function (e) {
      var t = e.target.closest("[data-act],[data-note],[data-missing],[data-tag],[data-todo],[data-copy]");
      if (!t || !host.contains(t)) { if (ui.menu && !e.target.closest(".tv-menu")) closeMenu(); return; }
      if (ui.menu && !t.closest(".tv-menu") && t.dataset.act !== "folder-menu" && t.dataset.act !== "note-menu") closeMenu();
      if (t.hasAttribute("data-copy")) {
        var code = t.parentElement.querySelector("code").textContent;
        var done = function () { t.textContent = "Copied"; setTimeout(function () { t.textContent = "Copy"; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done();
        return;
      }
      if (t.hasAttribute("data-todo") && route.page === "note") { toggleTodo(route.slug, +t.dataset.todo); render(); return; }
      if (t.classList.contains("wikilink") && t.dataset.note) { go({ page: "note", slug: t.dataset.note }); return; }
      if (t.classList.contains("tag") && t.dataset.tag && !t.dataset.act) { go({ page: "tag", tag: t.dataset.tag }); return; }
      var act = t.dataset.act;
      switch (act) {
        case "logo":
          if (phone()) { ui.drawer = false; host.classList.remove("drawer"); return; }
          vault.settings.sidebarCollapsed = !vault.settings.sidebarCollapsed;
          host.classList.toggle("collapsing", vault.settings.sidebarCollapsed);
          if (vault.settings.sidebarCollapsed) closeSearch();
          persist();
          host.classList.toggle("collapsed", vault.settings.sidebarCollapsed);
          renderSideHead();
          relayout(320);
          if (hooks.onSidebar) hooks.onSidebar(sidebarWidth());
          return;
        case "new-note": createUnnamed(""); return;
        case "new-folder":
          ui.naming = ui.naming && !ui.naming.into && ui.naming.rename == null ? null : { into: "" };
          renderTree(); renderSideHead(); return;
        case "search": if (ui.searching) closeSearch(); else openSearch(); return;
        case "seg":
          var name = t.dataset.segName, value = t.dataset.value;
          if (name === "search-mode") { vault.settings.searchMode = value; persist(); renderTree(); }
          if (name === "todo-view") { ui.todoView = value; renderTodos(); }
          return;
        case "tag-picker":
          var tags = allTags();
          openMenu(t, tags.slice(0, 100).map(function (pair) {
            return { label: "#" + pair[0] + "  " + pair[1], on: ui.tagFilter.indexOf(pair[0]) >= 0, keep: true, run: function (b) {
              var i = ui.tagFilter.indexOf(pair[0]);
              if (i >= 0) ui.tagFilter.splice(i, 1); else ui.tagFilter.push(pair[0]);
              b.classList.toggle("on", i < 0);
              renderTreeKeepMenu();
            } };
          }), "left");
          return;
        case "untag": ui.tagFilter = ui.tagFilter.filter(function (x) { return x !== t.dataset.tag; }); renderTree(); return;
        case "folder":
          var path = t.closest("[data-folder]").dataset.folder;
          if (ui.closedFolders.has(path)) { ui.closedFolders.delete(path); ui.justOpened = path; renderTree(); return; }
          ui.closedFolders.add(path);
          t.setAttribute("aria-expanded", "false");
          var chev = t.querySelector(".tv-chev"); if (chev) chev.classList.remove("open");
          // Fold the branch shut, then redraw without it.
          var branch = t.closest("li").querySelector(":scope > .tv-branch");
          if (!branch || hooks.reduce) { renderTree(); return; }
          branch.classList.remove("still"); branch.classList.add("folding");
          setTimeout(function () { if (ui.closedFolders.has(path)) renderTree(); }, 150);
          return;
        case "folder-menu":
          var fpath = t.closest("[data-folder]").dataset.folder;
          if (ui.menu && ui.menu.trigger === t) { closeMenu(); return; }
          openMenu(t, [
            { label: "New note", run: function () { createUnnamed(fpath); } },
            { label: "New folder", run: function () { ui.closedFolders.delete(fpath); ui.naming = { into: fpath }; renderTree(); } },
            { label: "Rename…", run: function () { ui.naming = { into: folderOf(fpath), rename: fpath }; renderTree(); } },
            { label: "Move to…", run: function () { moveModal("folder", fpath); } },
            { label: "Delete", run: function () { confirmModal("Delete folder", "Delete “" + fpath + "”? Everything in it moves up a level.", "Delete", function () { deleteFolder(fpath); render(); }); } }
          ]);
          return;
        case "note-menu":
          var nslug = t.closest("[data-note-row]").dataset.noteRow;
          if (ui.menu && ui.menu.trigger === t) { closeMenu(); return; }
          openMenu(t, [{ label: "Move to…", run: function () { moveModal("note", nslug); } }]);
          return;
        case "open": go({ page: "note", slug: t.dataset.slug }); return;
        case "go": go({ page: t.dataset.page }); return;
        case "tag": go({ page: "tag", tag: t.dataset.tag }); return;
        case "edit":
          flushSave();
          if (ui.editing) { ui.editing = false; ui.renaming = false; destroyEditor(); } else ui.editing = true;
          render(); return;
        case "rename": ui.renaming = true; renderNote(); setSeams(); return;
        case "note-actions":
          if (ui.menu && ui.menu.trigger === t) { closeMenu(); return; }
          openMenu(t, [
            { label: "Find in page…", run: openFind },
            { label: "Delete", danger: true, run: function () {
              var s = route.slug;
              confirmModal("Delete note", "Delete “" + filename(s) + "”? This cannot be undone.", "Delete", function () { deleteNote(s); go({ page: "home" }); });
            } }
          ], "right");
          return;
        case "close-vault": if (hooks.onClose) hooks.onClose(); return;
        case "drawer": ui.drawer = !ui.drawer; host.classList.toggle("drawer", ui.drawer); return;
        case "drawer-close": ui.drawer = false; host.classList.remove("drawer"); return;
        case "switcher": switcher(); return;
        case "modal-close": closeModal(); return;
        case "find-prev": stepFind(-1); return;
        case "find-next": stepFind(1); return;
        case "find-close": closeFind(); return;
        case "todo-toggle": toggleTodo(t.dataset.slug, +t.dataset.index); renderTodos(); renderTree(); return;
        case "todo-edit": ui.editingTodo = t.dataset.key; renderTodos(); return;
        case "todo-cancel": ui.editingTodo = null; renderTodos(); return;
        case "todo-save":
          var tx = page.querySelector('[data-part="todo-text"]').value.trim(), dd = page.querySelector('[data-part="todo-date"]').value, tm = page.querySelector('[data-part="todo-time"]').value;
          if (tx) editTodo(t.dataset.slug, +t.dataset.index, tx, dd ? dd + (tm ? "T" + tm : "") : null);
          ui.editingTodo = null; renderTodos(); return;
        case "cal-day": ui.calSel = t.dataset.day; renderTodos(); return;
        case "cal-prev": ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() - 1, 1); renderTodos(); return;
        case "cal-next": ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + 1, 1); renderTodos(); return;
        case "graph-filter":
          var tagsAll = allTags();
          ui.graphTags = ui.graphTags || [];
          openMenu(t, [{ note: (ui.graphTags.length ? ui.graphTags.length + " tags" : tagsAll.length + " tags") }].concat(tagsAll.map(function (pair) {
            return { label: "#" + pair[0] + "  " + pair[1], on: ui.graphTags.indexOf(pair[0]) >= 0, keep: true, run: function (b) {
              var i = ui.graphTags.indexOf(pair[0]);
              if (i >= 0) ui.graphTags.splice(i, 1); else ui.graphTags.push(pair[0]);
              b.classList.toggle("on", i < 0);
              var trig = ui.menu && ui.menu.trigger, menuEl = ui.menu && ui.menu.el;
              destroyGraphs(); ui.menu = null; renderGraph();
              if (menuEl) { var nt = page.querySelector('[data-act="graph-filter"]'); host.appendChild(menuEl); ui.menu = { el: menuEl, trigger: nt || trig }; }
            } };
          })), "right");
          return;
      }
    });
    function renderTreeKeepMenu() { var m = ui.menu; ui.menu = null; renderTree(); if (m) { var nt = tree.querySelector('[data-act="tag-picker"]'); ui.menu = { el: m.el, trigger: nt || m.trigger }; } }
    host.addEventListener("keydown", function (e) {
      var box = e.target.closest && e.target.closest(".todo-box");
      if (box && (e.key === " " || e.key === "Enter")) { e.preventDefault(); box.click(); }
      var link = e.target.closest && e.target.closest(".wikilink");
      if (link && e.key === "Enter") link.click();
      if (ui.menu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        var items = Array.from(ui.menu.el.querySelectorAll("button")), i = items.indexOf(document.activeElement);
        e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });

    // drag and drop (NoteTree.tsx)
    var dragging = null;
    tree.addEventListener("dragstart", function (e) {
      var row = e.target.closest("[data-note-row],[data-folder]"); if (!row) return;
      dragging = row.dataset.noteRow ? { kind: "note", path: row.dataset.noteRow } : { kind: "folder", path: row.dataset.folder };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(dragging.kind === "note" ? "application/x-note" : "application/x-folder", dragging.path);
    });
    tree.addEventListener("dragover", function (e) {
      if (!dragging) return;
      e.preventDefault();
      tree.querySelectorAll(".tv-folder.drop").forEach(function (f) { f.classList.remove("drop"); });
      var f = e.target.closest(".tv-folder");
      tree.classList.toggle("drop-root", !f);
      if (f) f.classList.add("drop");
    });
    tree.addEventListener("dragleave", function (e) { if (!tree.contains(e.relatedTarget)) { tree.classList.remove("drop-root"); tree.querySelectorAll(".tv-folder.drop").forEach(function (f) { f.classList.remove("drop"); }); } });
    tree.addEventListener("drop", function (e) {
      if (!dragging) return;
      e.preventDefault();
      var f = e.target.closest(".tv-folder"), into = f ? f.dataset.folder : "";
      var d = dragging; dragging = null;
      tree.classList.remove("drop-root");
      tree.querySelectorAll(".tv-folder.drop").forEach(function (el) { el.classList.remove("drop"); });
      if (d.kind === "note") moveNote(d.path, into); else if (into !== d.path && into.indexOf(d.path + "/") !== 0) moveFolder(d.path, into);
      render();
    });
    tree.addEventListener("dragend", function () { dragging = null; tree.classList.remove("drop-root"); tree.querySelectorAll(".tv-folder.drop").forEach(function (f) { f.classList.remove("drop"); }); });

    function onKey(e) {
      if (!mounted) return;
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); switcher(); return; }
      if (mod && e.key.toLowerCase() === "f" && route.page === "note") { e.preventDefault(); openFind(); return; }
      if (e.key === "Escape") {
        if (ui.modal) { closeModal(); e.stopPropagation(); return; }
        if (ui.menu) { closeMenu(); e.stopPropagation(); return; }
        if (findState && footer.contains(document.activeElement)) { closeFind(); return; }
        if (ui.drawer) { ui.drawer = false; host.classList.remove("drawer"); return; }
        if (ui.searching && sideHead.contains(document.activeElement)) { closeSearch(); return; }
        if (ui.graph && ui.graph.focused()) { ui.graph.clearFocus(); e.stopPropagation(); return; }
      }
    }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", function (e) { if (ui.menu && !ui.menu.el.contains(e.target) && e.target !== ui.menu.trigger && !ui.menu.trigger.contains(e.target)) closeMenu(); }, true);

    // phone: edge swipe opens the drawer (use-edge-swipe.ts)
    var swipe = null;
    host.addEventListener("touchstart", function (e) {
      if (!phone()) return;
      var r = host.getBoundingClientRect(), x = e.touches[0].clientX - r.left;
      if (!ui.drawer && x <= 24) swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, open: true };
      else if (ui.drawer) swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, open: false };
    }, { passive: true });
    host.addEventListener("touchmove", function (e) {
      if (!swipe) return;
      var dx = e.touches[0].clientX - swipe.x, dy = e.touches[0].clientY - swipe.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      if (swipe.open && dx > 0) { ui.drawer = true; host.classList.add("drawer"); }
      if (!swipe.open && dx < 0) { ui.drawer = false; host.classList.remove("drawer"); }
      swipe = null;
    }, { passive: true });

    return {
      open: function () {
        mounted = true;
        var n = note(route.slug);
        if (route.page === "note") ui.editing = !!n && (vault.settings.openInEditMode || n.body.trim() === "");
        render();
      },
      close: function () {
        flushSave(); persist(); closeFind(); closeModal(); closeMenu(); destroyEditor(); destroyGraphs();
        mounted = false;
      },
      sidebarWidth: sidebarWidth,
      seams: function () { setSeams(); return Array.prototype.slice.call(host.querySelectorAll("[data-seam]")); },
      summary: function () { return { saved: !!vault.saved, count: slugs().length }; },
      resized: function () { if (mounted) { host.classList.toggle("collapsed", !phone() && !!vault.settings.sidebarCollapsed); renderSideHead(); setSeams(); } }
    };
  }

  window.TryVault = TryVault;
})();
