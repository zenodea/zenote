import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL ?? "dev@local.test";
const PASSWORD = process.env.TEST_PASSWORD ?? "devpassword";

const ROUTES = ["/", "/graph", "/settings"];

const failures = [];
let checks = 0;

function check(condition, description) {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${description}`);
    return;
  }
  failures.push(description);
  console.log(`  FAIL ${description}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();

const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error)));

async function overflows() {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

async function signIn() {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 60000,
  });
  await page.waitForSelector("nav[aria-label='Main']", { timeout: 30000 });
}

console.log("sign in");
check(!(await overflows()), "/login fits the viewport");
await signIn();

console.log("routes");
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  check(!(await overflows()), `${route} has no horizontal overflow`);
  check(
    await page.isVisible("nav[aria-label='Main']"),
    `${route} keeps the bottom bar`,
  );
}

console.log("drawer");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const drawer = page.locator("nav[aria-label='Vault']");
check(
  (await drawer.evaluate((node) => node.getBoundingClientRect().right)) <= 1,
  "the drawer starts off screen",
);
await page.click("nav[aria-label='Main'] [aria-label='Vault menu']");
await page.waitForTimeout(500);
check(
  (await drawer.evaluate((node) => node.getBoundingClientRect().right)) > 100,
  "the bottom bar opens the drawer",
);
await page.mouse.click(360, 400);
await page.waitForTimeout(500);
check(
  (await drawer.evaluate((node) => node.getBoundingClientRect().right)) <= 1,
  "tapping away closes the drawer",
);

console.log("search");
await page.click("nav[aria-label='Main'] [aria-label='Jump to note']");
await page.waitForTimeout(400);
check(
  await page.isVisible("input[aria-label='Jump to note']"),
  "the bottom bar reaches the quick switcher",
);
await page.keyboard.press("Escape");

console.log("autosave");
const scratch = `mobile-check-${Date.now()}`;
await page.click("nav[aria-label='Main'] [aria-label='New note']");
await page.waitForSelector("input[aria-label='New note name']", {
  timeout: 15000,
});
await page.fill("input[aria-label='New note name']", scratch);
await page.press("input[aria-label='New note name']", "Enter");
await page.waitForURL(new RegExp(`/notes/${scratch}$`), { timeout: 30000 });
const href = `/notes/${scratch}`;
await page.waitForSelector(".cm-content", { timeout: 20000 });
check(true, "the bottom bar's new note lands in the editor");
await page.click(".cm-content");

const marker = `mobile-test-${Date.now()}`;
await page.keyboard.type(marker);

const saves = [];
page.on("request", (request) => {
  if (request.method() === "POST") saves.push(Date.now());
});
const hiddenAt = Date.now();
await page.evaluate(() => {
  for (const [key, value] of [
    ["visibilityState", "hidden"],
    ["hidden", true],
  ]) {
    Object.defineProperty(document, key, { value, configurable: true });
  }
  document.dispatchEvent(new Event("visibilitychange"));
});
await page.waitForTimeout(600);
check(
  saves.some((at) => at - hiddenAt < 500),
  "hiding the tab saves without waiting for the debounce",
);

await page.waitForTimeout(2000);
const fresh = await context.newPage();
await fresh.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
await fresh.waitForTimeout(1200);
check(
  (await fresh.textContent("main")).includes(marker),
  "what was typed before backgrounding is on the server",
);
await fresh.close();

console.log("clean up");
await page.evaluate(() => {
  for (const [key, value] of [
    ["visibilityState", "visible"],
    ["hidden", false],
  ]) {
    Object.defineProperty(document, key, { value, configurable: true });
  }
  document.dispatchEvent(new Event("visibilitychange"));
});
await page.click("[aria-label='Note actions']");
await page.click("text=Delete");
await page.click("div[role='dialog'] button:text-is('Delete')");
await page.waitForTimeout(1500);
check(
  !page.url().endsWith(href),
  "the scratch note is not left behind",
);

check(consoleErrors.length === 0, `no page errors (${consoleErrors.join("; ")})`);

await browser.close();

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length > 0) {
  console.error(`\nfailed:\n${failures.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
