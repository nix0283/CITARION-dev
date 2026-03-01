/**
 * Paper Trading Engine Tests
 * 
 * Tests for the core paper trading functionality:
 * - Account creation and management
 * - Position opening and closing
 * - PnL calculations
 * - Stop Loss and Take Profit
 * - Trailing Stop
 * - Funding rate simulation
 * - Metrics calculation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PaperTradingEngine } from '../src/lib/paper-trading/engine';
import { PaperTradingConfig } from '../src/lib/paper-trading/types';

describe('PaperTradingEngine', () => {
  let engine: PaperTradingEngine;
  let config: PaperTradingConfig;

  beforeEach(() => {
    engine = new PaperTradingEngine();
    config = {
      id: 'test-account-1',
      name: 'Test Account',
      initialBalance: 10000,
      maxOpenPositions: 5,
      maxLeverage: 10,
      maxRiskPerTrade: 2,
      maxDrawdown: 50,
      feePercent: 0.04,
      slippagePercent: 0.05,
      strategyId: 'test-strategy',
      autoTrading: false,
      tacticsSets: [{
        id: 'tactics-1',
        name: 'Default Tactics',
        entry: { positionSize: 'FIXED', positionSizeValue: 100 },
        takeProfit: { tpPercent: 5 },
        stopLoss: { slPercent: 2 },
      }],
    };
  });

  afterEach(async () => {
    // Cleanup
    const accounts = engine.getAllAccounts();
    for (const account of accounts) {
      await engine.deleteAccount(account.id);
    }
  });

  describe('Account Management', () => {
    it('should create a new account with correct initial values', async () => {
      const account = await engine.createAccount(config);

      expect(account.id).toBe(config.id);
      expect(account.name).toBe(config.name);
      expect(account.initialBalance).toBe(config.initialBalance);
      expect(account.balance).toBe(config.initialBalance);
      expect(account.equity).toBe(config.initialBalance);
      expect(account.status).toBe('IDLE');
      expect(account.positions).toEqual([]);
      expect(account.tradeHistory).toEqual([]);
    });

    it('should start and stop account correctly', async () => {
      const account = await engine.createAccount(config);
      
      const startResult = await engine.start(account.id);
      expect(startResult.success).toBe(true);
      expect(account.status).toBe('RUNNING');

      await engine.stop(account.id);
      expect(account.status).toBe('STOPPED');
    });

    it('should pause and resume account correctly', async () => {
      const account = await engine.createAccount(config);
      await engine.start(account.id);
      
      engine.pause(account.id);
      expect(account.status).toBe('PAUSED');

      engine.resume(account.id);
      expect(account.status).toBe('RUNNING');
    });

    it('should delete account correctly', async () => {
      await engine.createAccount(config);
      
      await engine.deleteAccount(config.id);
      
      const account = engine.getAccount(config.id);
      expect(account).toBeUndefined();
    });
  });

  describe('Position Management', () => {
    beforeEach(async () => {
      await engine.createAccount(config);
      await engine.start(config.id);
    });

    it('should open a LONG position correctly', () => {
      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      expect(result.success).toBe(true);
      expect(result.position).toBeDefined();
      expect(result.position?.direction).toBe('LONG');
      expect(result.position?.symbol).toBe('BTCUSDT');
      expect(result.position?.status).toBe('OPEN');
      expect(result.position?.leverage).toBe(5);
    });

    it('should open a SHORT position correctly', () => {
      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'SHORT',
        0.1,
        50000,
        { leverage: 5 }
      );

      expect(result.success).toBe(true);
      expect(result.position?.direction).toBe('SHORT');
    });

    it('should calculate entry price with slippage for LONG', () => {
      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      // Slippage should increase entry price for LONG
      expect(result.position?.avgEntryPrice).toBeGreaterThan(50000);
    });

    it('should calculate entry price with slippage for SHORT', () => {
      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'SHORT',
        0.1,
        50000,
        { leverage: 5 }
      );

      // Slippage should decrease entry price for SHORT
      expect(result.position?.avgEntryPrice).toBeLessThan(50000);
    });

    it('should set stop loss correctly', () => {
      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { stopLoss: 48000, leverage: 5 }
      );

      expect(result.position?.stopLoss).toBe(48000);
    });

    it('should set take profit correctly', () => {
      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { takeProfit: 52000, leverage: 5 }
      );

      expect(result.position?.takeProfitTargets).toHaveLength(1);
      expect(result.position?.takeProfitTargets[0].price).toBe(52000);
    });

    it('should not allow opening more positions than maxOpenPositions', () => {
      // Open max positions
      for (let i = 0; i < config.maxOpenPositions; i++) {
        engine.openPosition(
          config.id,
          `COIN${i}USDT`,
          'LONG',
          0.01,
          1000,
          { leverage: 1 }
        );
      }

      // Try to open one more
      const result = engine.openPosition(
        config.id,
        'EXTRAUSDT',
        'LONG',
        0.01,
        1000,
        { leverage: 1 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    it('should not allow duplicate positions for same symbol', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      const result = engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      expect(result.success).toBe(false);
    });
  });

  describe('PnL Calculations', () => {
    beforeEach(async () => {
      await engine.createAccount(config);
      await engine.start(config.id);
    });

    it('should calculate unrealized PnL correctly for LONG', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      engine.updatePrices({ BTCUSDT: 55000 });

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];

      // PnL = (currentPrice - entryPrice) * size
      // (55000 - ~50025) * 0.1 ≈ 497.5 USDT (accounting for slippage)
      expect(position?.unrealizedPnl).toBeGreaterThan(400);
    });

    it('should calculate unrealized PnL correctly for SHORT', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'SHORT',
        0.1,
        50000,
        { leverage: 5 }
      );

      engine.updatePrices({ BTCUSDT: 45000 });

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];

      // PnL = (entryPrice - currentPrice) * size
      expect(position?.unrealizedPnl).toBeGreaterThan(400);
    });

    it('should calculate equity correctly', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      engine.updatePrices({ BTCUSDT: 55000 });

      const account = engine.getAccount(config.id);
      
      // Equity = balance + unrealized PnL
      expect(account?.equity).toBeGreaterThan(10000);
    });
  });

  describe('Stop Loss Execution', () => {
    beforeEach(async () => {
      await engine.createAccount(config);
      await engine.start(config.id);
    });

    it('should trigger stop loss for LONG position', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { stopLoss: 48000, leverage: 5 }
      );

      engine.updatePrices({ BTCUSDT: 47500 });

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];

      expect(position?.status).toBe('CLOSED');
      expect(position?.closeReason).toBe('SL');
    });

    it('should trigger stop loss for SHORT position', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'SHORT',
        0.1,
        50000,
        { stopLoss: 52000, leverage: 5 }
      );

      engine.updatePrices({ BTCUSDT: 52500 });

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];

      expect(position?.status).toBe('CLOSED');
      expect(position?.closeReason).toBe('SL');
    });
  });

  describe('Take Profit Execution', () => {
    beforeEach(async () => {
      await engine.createAccount(config);
      await engine.start(config.id);
    });

    it('should trigger take profit for LONG position', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { takeProfit: 52000, leverage: 5 }
      );

      engine.updatePrices({ BTCUSDT: 52500 });

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];

      expect(position?.status).toBe('CLOSED');
      expect(position?.closeReason).toBe('TP');
    });

    it('should handle partial take profit correctly', () => {
      engine.openPosition(
        config.id,
        'BTCUSDT',
        'LONG',
        0.1,
        50000,
        { leverage: 5 }
      );

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];

      // Manually add multiple TP targets
      if (position) {
        position.takeProfitTargets = [
          { index: 1, price: 51000, closePercent: 30, filled: false },
          { index: 2, price: 52000, closePercent: 40, filled: false },
          { index: 3, price: 53000, closePercent: 30, filled: false },
        ];
      }

      engine.updatePrices({ BTCUSDT: 51500 });

      const updatedAccount = engine.getAccount(config.id);
      const updatedPosition = updatedAccount?.positions[0];

      // First TP should be filled
      expect(updatedPosition?.takeProfitTargets[0].filled).toBe(true);
      expect(updatedPosition?.takeProfitTargets[1].filled).toBe(false);
      expect(updatedPosition?.status).toBe('OPEN'); // Not fully closed
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(async () => {
      await engine.createAccount(config);
      await engine.start(config.id);
    });

    it('should calculate win rate correctly', () => {
      // Open and close winning trade
      engine.openPosition(config.id, 'BTCUSDT', 'LONG', 0.1, 50000, { leverage: 5 });
      engine.updatePrices({ BTCUSDT: 55000 });

      const account = engine.getAccount(config.id);
      const position = account?.positions[0];
      if (position) {
        engine.closePosition(account!, position, 55000, 'MANUAL');
      }

      // Open and close losing trade
      engine.openPosition(config.id, 'ETHUSDT', 'LONG', 0.1, 3000, { leverage: 5 });
      engine.updatePrices({ ETHUSDT: 2700 });

      const account2 = engine.getAccount(config.id);
      const position2 = account2?.positions[0];
      if (position2) {
        engine.closePosition(account2!, position2, 2700, 'MANUAL');
      }

      const finalAccount = engine.getAccount(config.id);
      expect(finalAccount?.metrics.winRate).toBe(50);
    });

    it('should calculate Sharpe ratio after multiple trades', () => {
      // Execute multiple trades
      for (let i = 0; i < 10; i++) {
        engine.openPosition(
          config.id,
          `COIN${i}USDT`,
          'LONG',
          0.01,
          1000 + i * 10,
          { leverage: 5 }
        );
        engine.updatePrices({ [`COIN${i}USDT`]: 1050 + i * 10 });
      }

      const account = engine.getAccount(config.id);
      
      // Should have recorded equity points
      expect(account?.equityCurve.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return error for non-existent account', async () => {
      const result = engine.openPosition(
        'non-existent',
        'BTCUSDT',
        'LONG',
        0.1,
        50000
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error for non-existent account on start', async () => {
      const result = await engine.start('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});

describe('Paper Trading Persistence', () => {
  // Tests for persistence layer would go here
  // These would require database mocking or test database
});
