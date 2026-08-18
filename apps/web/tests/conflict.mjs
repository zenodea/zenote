import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(path.join(process.cwd(), ".env.local"));

const BASE = "http://localhost:3000";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

await admin.from("notes").delete().like("slug", "%conflict%");
await admin.from("notes").delete().eq("slug", "scratch-offline");

const RUN = Date.now().toString(36);
const failures = [];
function check(cond, desc) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${desc}`);
  if (!cond) failures.push(desc);
}

async function rows(like) {
  const { data } = await admin.from("notes").select("slug,body").like("slug", like);
  return data ?? [];
}

async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "dev@local.test");
  await page.fill('input[type="password"]', "devpassword");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
  await page.waitForSelector("nav[aria-label='Vault'] >> text=Welcome", { timeout: 20000 });
}

async function toggleEdit(page) {
  return page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      (x.getAttribute("aria-label") || x.title || "").match(/edit/i));
    if (!b) return false;
    b.click();
    return true;
  });
}

async function typeAtEnd(page, text) {
  await page.waitForSelector(".cm-content", { timeout: 10000 });
  await page.click(".cm-content");
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(text);
}

const browser = await chromium.launch();

const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const a = await ctxA.newPage();
const b = await ctxB.newPage();
a.on("pageerror", (e) => console.log("A pageerror:", String(e)));
b.on("pageerror", (e) => console.log("B pageerror:", String(e)));

console.log("sign in both devices");
await signIn(a);
await signIn(b);

console.log("conflict: A offline-edits meeting-notes while B edits it online");
await ctxA.setOffline(true);
await a.click("nav[aria-label='Vault'] >> text=Meeting Notes");
await a.waitForURL("**/notes/work/meeting-notes");
await toggleEdit(a);
await typeAtEnd(a, ` FROM-DEVICE-A-${RUN}`);
await a.waitForTimeout(800);
await a.click("nav[aria-label='Vault'] >> text=Welcome");
await a.waitForTimeout(400);

await b.click("nav[aria-label='Vault'] >> text=Meeting Notes");
await b.waitForURL("**/notes/work/meeting-notes");
await toggleEdit(b);
await typeAtEnd(b, ` FROM-DEVICE-B-${RUN}`);
await b.waitForTimeout(3000);
const bLanded = await rows("work/meeting-notes");
check(bLanded[0]?.body.includes(`FROM-DEVICE-B-${RUN}`), "B's edit landed on the server");

console.log("A reconnects");
await ctxA.setOffline(false);
await a.evaluate(() => window.dispatchEvent(new Event("online")));
await a.waitForTimeout(5000);

const after = await rows("work/meeting-notes%");
const canonical = after.find((r) => r.slug === "work/meeting-notes");
const copy = after.find((r) => r.slug.includes("conflict"));
check(Boolean(canonical?.body.includes(`FROM-DEVICE-B-${RUN}`)), "server version kept B's edit");
check(Boolean(copy), `conflict copy exists (${copy?.slug ?? "none"})`);
check(Boolean(copy?.body.includes(`FROM-DEVICE-A-${RUN}`)), "conflict copy holds A's edit");
const sidebarCopy = await a.isVisible(`nav[aria-label='Vault'] >> text=conflict`);
check(sidebarCopy, "A's sidebar shows the conflict copy");

console.log("offline create + rename + delete on A");
await ctxA.setOffline(true);
await a.evaluate(() => window.dispatchEvent(new Event("offline")));
await a.click("[aria-label='New note']");
await a.fill("[aria-label='New note name']", "scratch-offline");
await a.keyboard.press("Enter");
await a.waitForURL("**/notes/scratch-offline", { timeout: 5000 });
await a.waitForSelector(".cm-content", { timeout: 5000 });
await a.click(".cm-content");
await a.keyboard.type("Born offline. Links to [[Welcome]].");
await a.waitForTimeout(700);
check(
  await a.isVisible("nav[aria-label='Vault'] >> text=scratch-offline"),
  "offline-created note appears in sidebar",
);

await a.click("nav[aria-label='Vault'] >> text=Roadmap");
await a.waitForURL("**/notes/work/projects/roadmap");
await a.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((x) =>
    (x.getAttribute("aria-label") || "").match(/rename|more|actions/i));
  if (btn) btn.click();
});
const modal = await a.isVisible("input[aria-label*='name' i]").catch(() => false);
console.log(`  (rename modal visible: ${modal})`);

console.log("A reconnects again");
await ctxA.setOffline(false);
await a.evaluate(() => window.dispatchEvent(new Event("online")));
await a.waitForTimeout(4000);
const created = await rows("scratch-offline");
check(created.length === 1, "offline-created note reached the server");
check(
  Boolean(created[0]?.body.includes("Born offline")),
  "offline-created body synced",
);

console.log("B pulls the new note");
await b.evaluate(() => window.dispatchEvent(new Event("online")));
await b.waitForTimeout(3000);
check(
  await b.isVisible("nav[aria-label='Vault'] >> text=scratch-offline"),
  "B's sidebar picked up A's offline-created note",
);

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall passed");
