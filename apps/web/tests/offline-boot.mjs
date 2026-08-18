import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const failures = [];
function check(cond, desc) {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${desc}`);
  if (!cond) failures.push(desc);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (e) => console.log("pageerror:", String(e)));

console.log("sign in and install the service worker");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "dev@local.test");
await page.fill('input[type="password"]', "devpassword");
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
await page.waitForSelector("nav[aria-label='Vault'] >> text=Welcome", { timeout: 20000 });

const swReady = await page.evaluate(async () => {
  const registration = await navigator.serviceWorker.ready;
  return Boolean(registration.active);
});
check(swReady, "service worker active");

await page.click("nav[aria-label='Vault'] >> text=Welcome");
await page.waitForTimeout(1500);

console.log("cold offline boot of a deep link");
await context.setOffline(true);
const page2 = await context.newPage();
page2.on("pageerror", (e) => console.log("page2 error:", String(e)));
const response = await page2.goto(`${BASE}/notes/work/projects/roadmap`, {
  waitUntil: "domcontentloaded",
  timeout: 30000,
}).catch((e) => (console.log("goto failed:", String(e)), null));
check(Boolean(response), "cached shell served while offline");
await page2.waitForTimeout(2500);
check(
  await page2.isVisible("text=Milestones for the quarter").catch(() => false),
  "deep-linked note rendered from IndexedDB",
);
check(
  await page2.isVisible("nav[aria-label='Vault'] >> text=Welcome").catch(() => false),
  "sidebar rendered offline",
);

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall passed");
