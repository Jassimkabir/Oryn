// Smoke test: the add sheet (expense, income, transfer, edit) and the settings forms.
// Needs the dev server on :3000. Runs on a fresh, empty phone (live data).
import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ ...devices["iPhone 15 Pro"], colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const key = (k) => page.getByRole("button", { name: k, exact: true }).click();
const open = async () => {
	await page.getByRole("button", { name: "Add an expense" }).click();
	await page.waitForTimeout(500);
};
const toastSeen = (t) => page.getByText(t).first().waitFor({ timeout: 3000 });

await page.goto("http://localhost:3000/?data=live", { waitUntil: "networkidle" });

// Expense with a sum on the keypad.
await open();
for (const k of ["1", "2", "0"]) await key(k);
await key("Add");
for (const k of ["8", "0"]) await key(k);
await page.getByText("= ₹200").waitFor({ timeout: 2000 });
await key("Dining");
await page.getByPlaceholder("Paid to").fill("Chai Point");
await key("Save");
await toastSeen("₹200 added to Dining");
await page.waitForTimeout(250);
await page.screenshot({ path: ".impeccable/review/shots/after-save.png" });
const row = await page.getByText("Chai Point").count();
const fresh = await page.locator('li[data-fresh="true"]').count();

// Income.
await open();
await page.getByText("Income", { exact: true }).click();
for (const k of ["5", "0", "0", "0"]) await key(k);
await key("Salary");
await key("Save");
await toastSeen("₹5,000 received as Salary");

// Transfer between accounts.
await open();
await page.getByText("Transfer", { exact: true }).click();
for (const k of ["3", "0", "0"]) await key(k);
await key("Cash");
await key("Save");
await toastSeen("₹300 moved to Cash");
await page.waitForTimeout(400);

// Edit the expense from Recent, then delete it and undo.
await page.getByRole("button", { name: /Chai Point/ }).click();
await page.waitForTimeout(500);
await page.getByText("Edit transaction").first().waitFor({ timeout: 2000 });
await key("Delete this transaction");
await toastSeen("Deleted");
await page.getByRole("listitem").filter({ hasText: "DeletedUndo" }).getByRole("button", { name: "Undo" }).click();
await page.waitForTimeout(300);
const restored = await page.getByText("Chai Point").count();

// Accounts card reflects the three entries: UPI −200 +5000 −300.
const accountsCard = await page.locator("#accounts").innerText();

// Settings: add an account and a recurring payment.
await page.goto("http://localhost:3000/settings/accounts?data=live", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Add an account" }).click();
await page.waitForTimeout(400);
await page.getByPlaceholder("HDFC savings").fill("ICICI card");
await page.getByText("Credit card", { exact: true }).click();
await page.getByPlaceholder("0").fill("12000");
await page.getByRole("button", { name: "Add account" }).click();
await page.waitForTimeout(400);
const card = await page.getByText("ICICI card").count();

await page.goto("http://localhost:3000/settings/recurring?data=live", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Add a recurring payment" }).click();
await page.waitForTimeout(400);
await page.getByPlaceholder("Netflix").fill("Netflix");
await page.getByPlaceholder("649").fill("649");
await page.getByRole("button", { name: "Add recurring payment" }).click();
await page.waitForTimeout(400);
const rec = await page.getByText("Every month").count();

console.log({ row, fresh, restored, card, rec, accountsCard: accountsCard.replace(/\s+/g, " "), errors });
await browser.close();
