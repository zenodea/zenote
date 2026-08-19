import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {}

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL ?? "dev@local.test";
const PASSWORD = process.env.TEST_PASSWORD ?? "devpassword";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const RUN = Date.now().toString(36);
const failures = [];
function check(condition, description) {
  console.log(`  ${condition ? "ok  " : "FAIL"} ${description}`);
  if (!condition) failures.push(description);
}

async function serverNote(slug) {
  const { data } = await admin
    .from("notes")
    .select("slug,body,title,vaults!inner(name)")
    .eq("slug", slug)
    .eq("vaults.name", "Initial Vault")
    .maybeSingle();
  return data;
}

async function toggleEdit(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")];
    const button = buttons.find((b) =>
      (b.getAttribute("aria-label") || b.title || "").match(/edit/i),
    );
    if (!button) return false;
    button.click();
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
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));

console.log("sign in");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
  timeout: 60000,
});

console.log("vault renders from the client store");
await page.waitForSelector("nav[aria-label='Vault'] >> text=Welcome", {
  timeout: 20000,
});
check(true, "sidebar shows seeded notes");

console.log("client-side navigation");
let rscFetches = 0;
page.on("request", (request) => {
  if (request.url().includes("_rsc") && !request.headers()["next-router-prefetch"]) {
    rscFetches += 1;
  }
});
await page.click("nav[aria-label='Vault'] >> text=Welcome");
await page.waitForURL("**/notes/welcome");
await page.waitForTimeout(500);
check(
  await page.isVisible("text=This vault links to"),
  "note renders after client nav",
);
check(rscFetches === 0, `client nav made no RSC fetches (saw ${rscFetches})`);

console.log("online edit pushes");
check(await toggleEdit(page), "found edit toggle");
await typeAtEnd(page, ` EDITED-ONLINE-${RUN}`);
await page.waitForTimeout(3000);
const online = await serverNote("welcome");
check(
  Boolean(online?.body.includes(`EDITED-ONLINE-${RUN}`)),
  "online edit reached Supabase",
);

console.log("offline");
await context.setOffline(true);
await page.click("nav[aria-label='Vault'] >> text=Roadmap");
await page.waitForURL("**/notes/work/projects/roadmap");
await page.waitForTimeout(300);
check(
  await page.isVisible("text=Milestones for the quarter"),
  "offline nav renders from the store",
);

await toggleEdit(page);
await typeAtEnd(page, ` EDITED-OFFLINE-${RUN}`);
await page.waitForTimeout(1500);
const heldBack = await serverNote("work/projects/roadmap");
check(
  !heldBack.body.includes(`EDITED-OFFLINE-${RUN}`),
  "offline edit stays local while offline",
);

await page.goBack();
await page.waitForTimeout(500);
check(
  new URL(page.url()).pathname === "/notes/welcome",
  "goBack lands on the previous note",
);
check(await page.isVisible("text=This vault links to"), "goBack renders offline");
await page.goForward();
await page.waitForTimeout(500);

console.log("reconnect");
await context.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForTimeout(4000);
const synced = await serverNote("work/projects/roadmap");
check(
  Boolean(synced?.body.includes(`EDITED-OFFLINE-${RUN}`)),
  "offline edit synced after reconnect",
);

console.log("indexeddb");
const idbCount = await page.evaluate(async () => {
  const dbs = await indexedDB.databases();
  const name = dbs.find((db) => db.name?.startsWith("zenote-vault-"))?.name;
  if (!name) return 0;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const count = await new Promise((resolve, reject) => {
    const request = db.transaction("notes").objectStore("notes").count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return count;
});
check(idbCount >= 4, `IndexedDB holds the vault (${idbCount} notes)`);

check(
  errors.length === 0,
  `no page errors${errors.length ? `: ${errors.slice(0, 3).join(" | ")}` : ""}`,
);

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall passed");
