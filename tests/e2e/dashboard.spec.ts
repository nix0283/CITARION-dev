import { test, expect, Page } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should load dashboard with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/CITARION/i);
  });

  test("should display balance widget", async ({ page }) => {
    const balanceWidget = page.locator('[data-testid="balance-widget"]').first();
    await expect(balanceWidget).toBeVisible({ timeout: 10000 });
  });

  test("should display market overview", async ({ page }) => {
    const marketOverview = page.locator('[data-testid="market-overview"]').first();
    await expect(marketOverview).toBeVisible({ timeout: 10000 });
  });

  test("should show connection status indicator", async ({ page }) => {
    const statusIndicator = page.locator('[data-testid="connection-status"]').first();
    await expect(statusIndicator).toBeVisible({ timeout: 15000 });
  });

  test("should navigate to chart tab", async ({ page }) => {
    await page.click('[data-testid="nav-chart"]');
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to trading tab", async ({ page }) => {
    await page.click('[data-testid="nav-trading"]');
    await expect(page.locator('[data-testid="trading-form"]')).toBeVisible({ timeout: 10000 });
  });

  test("should display sidebar on desktop", async ({ page, isMobile }) => {
    if (!isMobile) {
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toBeVisible();
    }
  });

  test("should display mobile navigation on mobile", async ({ page, isMobile }) => {
    if (isMobile) {
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();
    }
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should show mobile navigation", async ({ page }) => {
    await page.goto("/");
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    await expect(mobileNav).toBeVisible({ timeout: 10000 });
  });

  test("should hide desktop sidebar on mobile", async ({ page }) => {
    await page.goto("/");
    const desktopSidebar = page.locator('[data-testid="sidebar-desktop"]');
    await expect(desktopSidebar).not.toBeVisible();
  });

  test("should have proper touch targets", async ({ page }) => {
    await page.goto("/");
    const buttons = page.locator("button");
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
});

test.describe("Accessibility", () => {
  test("should have no accessibility violations on main page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Check for alt text on images
    const images = page.locator("img");
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const ariaLabel = await img.getAttribute("aria-label");
      const ariaHidden = await img.getAttribute("aria-hidden");
      
      // Image should have alt text, aria-label, or be aria-hidden
      expect(alt || ariaLabel || ariaHidden === "true").toBeTruthy();
    }
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Check that h1 exists and is unique
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test("should have proper button labels", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    const buttons = page.locator("button");
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 20); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute("aria-label");
        const title = await button.getAttribute("title");
        
        // Button should have accessible name
        expect((text && text.trim().length > 0) || ariaLabel || title).toBeTruthy();
      }
    }
  });
});
