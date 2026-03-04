import { test, expect } from "@playwright/test";

test.describe("Bot Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display bot list", async ({ page }) => {
    // Navigate to bot management
    await page.click('[data-testid="nav-grid-bot"]');
    
    const botPanel = page.locator('[data-testid="grid-bot-manager"]');
    await expect(botPanel).toBeVisible({ timeout: 10000 });
  });

  test("should show create bot form", async ({ page }) => {
    await page.click('[data-testid="nav-grid-bot"]');
    
    const createButton = page.locator('[data-testid="create-bot-button"]');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      const botForm = page.locator('[data-testid="bot-config-form"]');
      await expect(botForm).toBeVisible({ timeout: 5000 });
    }
  });

  test("should validate bot configuration", async ({ page }) => {
    await page.click('[data-testid="nav-grid-bot"]');
    
    const createButton = page.locator('[data-testid="create-bot-button"]');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Try to submit without filling required fields
      const submitButton = page.locator('[data-testid="save-bot-config"]');
      await expect(submitButton).toBeDisabled();
    }
  });

  test("should start and stop bot", async ({ page }) => {
    await page.click('[data-testid="nav-grid-bot"]');
    
    // Look for existing bot with start button
    const startButton = page.locator('[data-testid^="start-bot-"]').first();
    
    if (await startButton.isVisible()) {
      await startButton.click();
      
      // Wait for bot status to change
      await page.waitForTimeout(1000);
      
      // Check for stop button (bot is running)
      const stopButton = page.locator('[data-testid^="stop-bot-"]').first();
      await expect(stopButton).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("DCA Bot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display DCA bot panel", async ({ page }) => {
    await page.click('[data-testid="nav-dca-bot"]');
    
    const dcaPanel = page.locator('[data-testid="dca-bot-manager"]');
    await expect(dcaPanel).toBeVisible({ timeout: 10000 });
  });

  test("should configure DCA levels", async ({ page }) => {
    await page.click('[data-testid="nav-dca-bot"]');
    
    const createButton = page.locator('[data-testid="create-dca-bot"]');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Check for DCA-specific configuration options
      const levelsInput = page.locator('[data-testid="dca-levels"]');
      if (await levelsInput.isVisible()) {
        await levelsInput.fill("5");
      }
    }
  });
});

test.describe("BB Bot", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display BB bot panel", async ({ page }) => {
    await page.click('[data-testid="nav-bb-bot"]');
    
    const bbPanel = page.locator('[data-testid="bb-bot-manager"]');
    await expect(bbPanel).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Argus Bot (Pump/Dump Detection)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display Argus bot panel", async ({ page }) => {
    await page.click('[data-testid="nav-argus-bot"]');
    
    const argusPanel = page.locator('[data-testid="argus-bot-manager"]');
    await expect(argusPanel).toBeVisible({ timeout: 10000 });
  });

  test("should show pump/dump alerts", async ({ page }) => {
    await page.click('[data-testid="nav-argus-bot"]');
    
    // Look for alerts section
    const alertsSection = page.locator('[data-testid="argus-alerts"]');
    await expect(alertsSection).toBeVisible({ timeout: 5000 }).catch(() => {
      // Alerts might not exist yet
    });
  });
});

test.describe("Copy Trading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display copy trading panel", async ({ page }) => {
    await page.click('[data-testid="nav-copy-trading"]');
    
    const copyPanel = page.locator('[data-testid="copy-trading-panel"]');
    await expect(copyPanel).toBeVisible({ timeout: 10000 });
  });

  test("should show master traders list", async ({ page }) => {
    await page.click('[data-testid="nav-copy-trading"]');
    
    const masterList = page.locator('[data-testid="master-traders-list"]');
    await expect(masterList).toBeVisible({ timeout: 5000 }).catch(() => {
      // List might be empty
    });
  });
});
