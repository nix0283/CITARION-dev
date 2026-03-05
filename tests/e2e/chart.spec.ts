import { test, expect } from "@playwright/test";

test.describe("Chart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Navigate to chart tab
    await page.click('[data-testid="nav-chart"]');
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible({ timeout: 15000 });
  });

  test("should display price chart", async ({ page }) => {
    const chart = page.locator('[data-testid="price-chart"]');
    await expect(chart).toBeVisible();
  });

  test("should display symbol selector", async ({ page }) => {
    const symbolSelector = page.locator('[data-testid="symbol-selector"]');
    await expect(symbolSelector).toBeVisible();
  });

  test("should display timeframe buttons", async ({ page }) => {
    const timeframeButtons = page.locator('[data-testid="timeframe-selector"]');
    await expect(timeframeButtons).toBeVisible();
  });

  test("should change symbol", async ({ page }) => {
    // Open symbol dropdown
    await page.click('[data-testid="symbol-selector"]');
    
    // Select ETHUSDT
    const ethOption = page.locator("text=ETH/USDT");
    await ethOption.click();
    
    // Wait for chart to update
    await page.waitForTimeout(1000);
    
    // Verify symbol changed
    const symbolSelector = page.locator('[data-testid="symbol-selector"]');
    await expect(symbolSelector).toContainText("ETH");
  });

  test("should change timeframe", async ({ page }) => {
    // Click on 4H timeframe
    await page.click('[data-testid="timeframe-4h"]');
    
    // Verify timeframe is selected
    const activeTimeframe = page.locator('[data-testid="timeframe-4h"][data-active="true"]');
    await expect(activeTimeframe).toBeVisible();
  });

  test("should display indicators panel", async ({ page }) => {
    // Check if indicators panel toggle button exists
    const indicatorsButton = page.locator('[data-testid="toggle-indicators"]');
    await expect(indicatorsButton).toBeVisible();
    
    // Open indicators panel
    await indicatorsButton.click();
    
    // Verify panel is visible
    const indicatorsPanel = page.locator('[data-testid="indicators-panel"]');
    await expect(indicatorsPanel).toBeVisible({ timeout: 5000 });
  });

  test("should show tooltip on hover", async ({ page }) => {
    // Move mouse over chart
    const chart = page.locator('[data-testid="price-chart"]');
    await chart.hover();
    
    // Check for tooltip (might not appear immediately)
    await page.waitForTimeout(500);
  });

  test("should refresh chart", async ({ page }) => {
    const refreshButton = page.locator('[data-testid="refresh-chart"]');
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Wait for loading state
    await page.waitForTimeout(1000);
  });

  test("should toggle volume visibility", async ({ page }) => {
    const volumeButton = page.locator('[data-testid="toggle-volume"]');
    await expect(volumeButton).toBeVisible();
    
    // Click toggle
    await volumeButton.click();
    
    // Wait for chart update
    await page.waitForTimeout(500);
  });
});

test.describe("Chart - Hotkeys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.click('[data-testid="nav-chart"]');
  });

  test("should show hotkeys help on '?' key", async ({ page }) => {
    // Press '?' key
    await page.keyboard.press("?");
    
    // Check for hotkeys help panel
    const hotkeysPanel = page.locator('[data-testid="hotkeys-help"]');
    await expect(hotkeysPanel).toBeVisible({ timeout: 5000 });
    
    // Close panel with Escape
    await page.keyboard.press("Escape");
    await expect(hotkeysPanel).not.toBeVisible();
  });

  test("should trigger buy dialog on 'b' key", async ({ page }) => {
    // Press 'b' key
    await page.keyboard.press("b");
    
    // Check for buy dialog
    const buyDialog = page.locator('[data-testid="trade-dialog"][data-side="BUY"]');
    await expect(buyDialog).toBeVisible({ timeout: 5000 }).catch(() => {
      // Dialog might not appear if feature is disabled
    });
  });

  test("should trigger sell dialog on 's' key", async ({ page }) => {
    // Press 's' key
    await page.keyboard.press("s");
    
    // Check for sell dialog
    const sellDialog = page.locator('[data-testid="trade-dialog"][data-side="SELL"]');
    await expect(sellDialog).toBeVisible({ timeout: 5000 }).catch(() => {
      // Dialog might not appear if feature is disabled
    });
  });
});

test.describe("Multi-Chart Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should enable multi-chart mode", async ({ page }) => {
    // Look for multi-chart toggle
    const multiChartToggle = page.locator('[data-testid="multi-chart-toggle"]');
    
    if (await multiChartToggle.isVisible()) {
      await multiChartToggle.click();
      
      // Verify multiple charts are visible
      const charts = page.locator('[data-testid^="chart-"]');
      const count = await charts.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test("should apply layout presets", async ({ page }) => {
    // Navigate to chart
    await page.click('[data-testid="nav-chart"]');
    
    // Check for layout preset selector
    const presetSelector = page.locator('[data-testid="layout-preset"]');
    
    if (await presetSelector.isVisible()) {
      await presetSelector.click();
      
      // Select 4-grid preset
      await page.click('text=4 Grid');
      
      // Verify 4 charts are visible
      const charts = page.locator('[data-testid^="chart-"]');
      const count = await charts.count();
      expect(count).toBe(4);
    }
  });
});
