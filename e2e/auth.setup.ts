import { expect, test as setup } from "@playwright/test";
import { ADMIN_PHONE, adminStatePath, login } from "./helpers";

// The administrator signs in once per run; desktop and mobile tests reuse the saved session. Two projects asking
// for a code for the same phone at once would each invalidate the other's code.
setup("administrator signs in", async ({ page }) => {
  await login(page, ADMIN_PHONE, "/sourcer");
  await expect(page.getByRole("heading", { name: /Очередь заявок/ })).toBeVisible();
  await page.context().storageState({ path: adminStatePath() });
});
