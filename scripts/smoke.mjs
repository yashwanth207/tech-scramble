import { chromium } from "playwright";

const base = process.env.SMOKE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const mobile = process.env.SMOKE_MOBILE === "1";
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByTestId("start-game").waitFor({ state: "visible" });
  for (const id of ["foundations", "code", "ai", "cyber", "mix"]) {
    await page.getByTestId(`set-${id}`).click();
    const alerts = await page.getByRole("alert").allInnerTexts();
    if (alerts.length > 0) throw new Error(`${id} is blocked: ${alerts.join(" | ")}`);
    if (await page.getByTestId("start-game").isDisabled()) throw new Error(`${id} cannot start`);
  }
  await page.getByTestId("set-foundations").click();
  await page.locator('input[type="number"]').first().fill("1");
  await page.getByTestId("start-game").click();
  await page.getByRole("heading", { name: "Guess the Tech Term" }).waitFor();
  await page.getByTestId("continue").click();
  await page.getByTestId("answer-input").fill("nope");
  await page.getByTestId("submit-answer").click();
  await page.getByTestId("feedback").waitFor();
  await page.getByTestId("continue").click();
  await page.getByTestId("continue").click();
  await page.getByTestId("continue").click();

  await page.getByTestId("answer-real").click();
  await page.getByTestId("feedback").waitFor();
  await page.getByTestId("continue").click();
  await page.getByTestId("continue").click();
  await page.getByTestId("continue").click();
  await page.getByTestId("taboo-ready").click();
  await page.getByTestId("taboo-term").waitFor();
  await page.getByTestId("skip").click();
  await page.getByTestId("continue").click();
  await page.getByTestId("results").waitFor();
  const title = await page.locator("h1").innerText();
  if (!title.trim()) throw new Error("Results heading is empty");
  if (errors.length > 0) throw new Error(errors.join("\n"));
  console.log(`SMOKE_OK ${title}`);
} catch (error) {
  await page.screenshot({ path: "C:/Users/SAICHA~1/AppData/Local/Temp/techverse-smoke.png", fullPage: true });
  throw error;
} finally {
  await browser.close();
}
