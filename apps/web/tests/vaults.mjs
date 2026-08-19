import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(path.join(process.cwd(), ".env.local"));

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

await admin.from("vaults").delete().like("name", "Scratch%");

const failures = [];
function check(cond, desc) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${desc}`);
  if (!cond) failures.push(desc);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  extraHTTPHeaders: { "x-zenote-desktop": "1" },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 200)));

console.log("guest desktop boot");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
check(
  await page.isVisible("text=Create a vault"),
  "guest lands on the vault setup screen",
);

await page.fill("[aria-label='Vault name']", `Scratch ${RUN}`);
await page.click("text=Create vault");
await page.waitForSelector("[aria-label='New note']", { timeout: 10000 });
check(true, "vault created without signing in");

console.log("footer vault name");
const footerName = page.locator("a[href='/vaults']");
check(
  (await footerName.textContent())?.includes(`Scratch ${RUN}`),
  "vault name sits in the sidebar footer",
);
check(
  (await footerName.textContent())?.includes("Local vault"),
  "footer shows the local badge",
);
await footerName.click();
await page.waitForURL("**/vaults");
await page.waitForSelector("[aria-label='Vault name']", { timeout: 5000 });
check(true, "clicking the name opens the vaults page");

console.log("rename from the vaults page");
await page.fill("[aria-label='Vault name']", `Scratch ${RUN} renamed`);
await page.click("text=Rename");
await page.waitForTimeout(500);
check(
  (await footerName.textContent())?.includes(`Scratch ${RUN} renamed`),
  "rename shows up in the footer",
);

console.log("guest note");
await page.click("[aria-label='New note']");
await page.fill("[aria-label='New note name']", "guest-note");
await page.keyboard.press("Enter");
await page.waitForURL("**/notes/guest-note", { timeout: 10000 });
await page.waitForSelector(".cm-content", { timeout: 10000 });
await page.click(".cm-content");
await page.keyboard.type(`Written before signing in. ${RUN}`);
await page.waitForTimeout(800);

const { data: before } = await admin
  .from("notes")
  .select("slug")
  .eq("slug", "guest-note");
check((before ?? []).length === 0, "guest note is not on the server");

console.log("sign in via the animated flow, then back");
await page.goto(`${BASE}/vaults`, { waitUntil: "networkidle" });
await page.click("button:has-text('Sign in')");
await page.waitForURL("**/login?from=vault", { timeout: 15000 });
await page.waitForSelector("[aria-label='Back to your vault']", {
  timeout: 5000,
});
check(true, "login shows the back button when coming from a vault");
await page.click("[aria-label='Back to your vault']");
await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 });
await page.waitForSelector("nav[aria-label='Vault'] >> text=guest-note", {
  timeout: 10000,
});
check(true, "back returns to the local vault");

console.log("sign in for real");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "dev@local.test");
await page.fill('input[type="password"]', "devpassword");
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
  timeout: 60000,
});
await page.waitForSelector("nav[aria-label='Vault'] >> text=guest-note", {
  timeout: 15000,
});
check(true, "guest vault survives signing in");

console.log("sync the vault up");
await page.goto(`${BASE}/vaults`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Sync vault", { timeout: 10000 });
await page.click("text=Sync vault");
await page.waitForTimeout(4000);

const { data: vaultRow } = await admin
  .from("vaults")
  .select("id,name")
  .eq("name", `Scratch ${RUN} renamed`)
  .maybeSingle();
check(Boolean(vaultRow), "vault row created on the server under its new name");

const { data: synced } = await admin
  .from("notes")
  .select("slug,body,vault_id")
  .eq("slug", "guest-note")
  .maybeSingle();
check(Boolean(synced?.body.includes(RUN)), "guest note reached the server");
check(synced?.vault_id === vaultRow?.id, "note landed in the synced vault");

console.log("attach both seeded vaults");
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("text=On your account", { timeout: 10000 });
await page
  .locator("li", { hasText: "Initial Vault" })
  .getByText("Open")
  .click();
await page.waitForSelector("nav[aria-label='Vault'] >> text=Roadmap", {
  timeout: 20000,
});
check(true, "Initial Vault attached and pulled");

await page.goto(`${BASE}/vaults`, { waitUntil: "networkidle" });
await page.locator("li", { hasText: "Work" }).getByText("Open").click();
await page.waitForSelector("nav[aria-label='Vault'] >> text=Plan", {
  timeout: 20000,
});
check(true, "Work vault attached and pulled");

await page.click("nav[aria-label='Vault'] >> text=Welcome");
await page.waitForTimeout(500);
check(
  await page.isVisible("text=The Work vault's own welcome"),
  "duplicate slugs stay separate per vault",
);

console.log("switch back");
await page.goto(`${BASE}/vaults`, { waitUntil: "networkidle" });
await page.click(`text=Scratch ${RUN} renamed`);
await page.waitForSelector("nav[aria-label='Vault'] >> text=guest-note", {
  timeout: 10000,
});
check(true, "switching vaults swaps the notes");

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall passed");
