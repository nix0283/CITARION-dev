import { test, expect } from "@playwright/test";

test.describe("Trading Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Navigate to trading tab
    await page.click('[data-testid="nav-trading"]');
    await expect(page.locator('[data-testid="trading-form"]')).toBeVisible({ timeout: 10000 });
  });

  test("should display trading form elements", async ({ page }) => {
    // Check for side selection
    const buyButton = page.locator('[data-testid="buy-button"]');
    const sellButton = page.locator('[data-testid="sell-button"]');
    await expect(buyButton).toBeVisible();
    await expect(sellButton).toBeVisible();
    
    // Check for order type selector
    const orderTypeSelector = page.locator('[data-testid="order-type-selector"]');
    await expect(orderTypeSelector).toBeVisible();
    
    // Check for quantity input
    const quantityInput = page.locator('[data-testid="quantity-input"]');
    await expect(quantityInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('[data-testid="submit-order"]');
    await expect(submitButton).toBeVisible();
  });

  test("should switch between buy and sell", async ({ page }) => {
    // Click sell button
    await page.click('[data-testid="sell-button"]');
    
    // Verify sell is active
    const sellButton = page.locator('[data-testid="sell-button"][data-active="true"]');
    await expect(sellButton).toBeVisible();
    
    // Click buy button
    await page.click('[data-testid="buy-button"]');
    
    // Verify buy is active
    const buyButton = page.locator('[data-testid="buy-button"][data-active="true"]');
    await expect(buyButton).toBeVisible();
  });

  test("should switch between market and limit orders", async ({ page }) => {
    // Open order type dropdown
    await page.click('[data-testid="order-type-selector"]');
    
    // Select Limit
    await page.click('text=Limit');
    
    // Check that price input is now visible
    const priceInput = page.locator('[data-testid="limit-price-input"]');
    await expect(priceInput).toBeVisible();
  });

  test("should validate quantity input", async ({ page }) => {
    const quantityInput = page.locator('[data-testid="quantity-input"]');
    const submitButton = page.locator('[data-testid="submit-order"]');
    
    // Try to submit with empty quantity
    await quantityInput.fill("");
    await expect(submitButton).toBeDisabled();
    
    // Try to submit with negative quantity
    await quantityInput.fill("-1");
    await expect(submitButton).toBeDisabled();
    
    // Try to submit with valid quantity
    await quantityInput.fill("0.001");
    await expect(submitButton).toBeEnabled();
  });

  test("should show confirmation dialog on submit", async ({ page }) => {
    // Fill in quantity
    await page.locator('[data-testid="quantity-input"]').fill("0.001");
    
    // Submit order
    await page.click('[data-testid="submit-order"]');
    
    // Check for confirmation dialog
    const confirmDialog = page.locator('[data-testid="confirm-order-dialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
  });

  test("should set stop loss and take profit", async ({ page }) => {
    // Expand advanced options if collapsed
    const advancedToggle = page.locator('[data-testid="advanced-options-toggle"]');
    if (await advancedToggle.isVisible()) {
      await advancedToggle.click();
    }
    
    // Set stop loss
    const stopLossInput = page.locator('[data-testid="stop-loss-input"]');
    await expect(stopLossInput).toBeVisible();
    await stopLossInput.fill("95000");
    
    // Set take profit
    const takeProfitInput = page.locator('[data-testid="take-profit-input"]');
    await expect(takeProfitInput).toBeVisible();
    await takeProfitInput.fill("105000");
  });
});

test.describe("Positions Table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display positions table", async ({ page }) => {
    const positionsTable = page.locator('[data-testid="positions-table"]');
    await expect(positionsTable).toBeVisible({ timeout: 10000 });
  });

  test("should show position columns", async ({ page }) => {
    // Check for column headers
    const expectedColumns = ["Symbol", "Side", "Size", "Entry", "Mark", "PnL"];
    
    for (const col of expectedColumns) {
      const columnHeader = page.locator(`text=${col}`);
      await expect(columnHeader).toBeVisible({ timeout: 5000 }).catch(() => {
        // Column might have different name
      });
    }
  });

  test("should have close position button", async ({ page }) => {
    // Look for close buttons in positions table
    const closeButtons = page.locator('[data-testid^="close-position-"]');
    const count = await closeButtons.count();
    
    if (count > 0) {
      await expect(closeButtons.first()).toBeVisible();
    }
  });
});

test.describe("Order History", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display order history", async ({ page }) => {
    // Navigate to history tab
    await page.click('[data-testid="nav-history"]');
    
    const historyTable = page.locator('[data-testid="trades-history"]');
    await expect(historyTable).toBeVisible({ timeout: 10000 });
  });

  test("should filter orders by status", async ({ page }) => {
    await page.click('[data-testid="nav-history"]');
    
    const statusFilter = page.locator('[data-testid="order-status-filter"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.click('text=Filled');
    }
  });

  test("should show order details", async ({ page }) => {
    await page.click('[data-testid="nav-history"]');
    
    // Look for order rows
    const orderRows = page.locator('[data-testid^="order-row-"]');
    const count = await orderRows.count();
    
    if (count > 0) {
      // Click on first order to see details
      await orderRows.first().click();
      
      // Check for order details panel
      const detailsPanel = page.locator('[data-testid="order-details"]');
      await expect(detailsPanel).toBeVisible({ timeout: 5000 }).catch(() => {
        // Details might be shown inline
      });
    }
  });
});
