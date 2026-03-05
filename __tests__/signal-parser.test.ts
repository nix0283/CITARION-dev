/**
 * Signal Parser Tests
 * 
 * Tests for signal parsing from various formats:
 * - Cornix format
 * - TradingView format
 * - Free text format
 * - Russian language support
 */

import { describe, it, expect } from 'bun:test';
import { parseSignal, parseManagementCommand, type ParsedSignal } from '../src/lib/signal-parser';

describe('Signal Parser', () => {
  describe('Cornix Format Parsing', () => {
    it('should parse basic LONG signal', () => {
      const signalText = `
#BTC/USDT
Exchanges: Binance Futures
Signal Type: Regular (Long)
Leverage: Isolated (10X)
Entry Zone: 50000 - 50000
Take-Profit Targets: 1) 52000 2) 54000 3) 56000
Stop Targets: 1) 48000
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.symbol).toBe('BTCUSDT');
      expect(signal?.direction).toBe('LONG');
      expect(signal?.action).toBe('BUY');
      expect(signal?.marketType).toBe('FUTURES');
      expect(signal?.leverage).toBe(10);
      expect(signal?.entryPrices).toContain(50000);
      expect(signal?.takeProfits).toHaveLength(3);
      expect(signal?.stopLoss).toBe(48000);
    });

    it('should parse basic SHORT signal', () => {
      const signalText = `
#ETH/USDT
Exchanges: Binance Futures
Signal Type: Regular (Short)
Leverage: Cross (5X)
Entry Zone: 3500 - 3450
Take-Profit Targets: 1) 3300 2) 3200
Stop Targets: 1) 3650
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.symbol).toBe('ETHUSDT');
      expect(signal?.direction).toBe('SHORT');
      expect(signal?.leverageType).toBe('CROSS');
      expect(signal?.entryPrices).toContain(3500);
      expect(signal?.entryPrices).toContain(3450);
    });

    it('should parse SPOT signal', () => {
      const signalText = `
#SOL/USDT SPOT
Exchanges: Binance
Buy: 150
Take-Profit: 160, 170, 180
Stop: 140
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.marketType).toBe('SPOT');
      expect(signal?.leverage).toBe(1);
      expect(signal?.direction).toBe('LONG'); // Buy indicates LONG
    });

    it('should parse signal with multiple entries', () => {
      const signalText = `
BTCUSDT long leverage 10x cross
entry 50000 49500 49000
tp 52000 54000 56000
sl 48000
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.entryPrices).toHaveLength(3);
      expect(signal?.takeProfits).toHaveLength(3);
    });
  });

  describe('Russian Language Support', () => {
    it('should parse Russian LONG signal', () => {
      const signalText = `
⚡⚡ #BTCUSDT ⚡⚡
Биржи: Binance Futures
Тип сигнала: Обычный (Лонг)
Плечо: Изолировано (10X)
Зона входа: 50000 - 50000
Тейк-профиты: 1) 52000 2) 54000
Стоп-лосс: 48000
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.direction).toBe('LONG');
      expect(signal?.entryPrices).toContain(50000);
    });

    it('should parse Russian SHORT signal', () => {
      const signalText = `
#ETHUSDT ШОРТ
Вход: 3500
ТП: 3300, 3100
СЛ: 3700
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.direction).toBe('SHORT');
    });

    it('should parse Russian SPOT signal', () => {
      const signalText = `
#SOLUSDT СПOT
Покупка: 150
Тейк: 160, 170
Стоп: 140
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.marketType).toBe('SPOT');
    });
  });

  describe('Simple Format Parsing', () => {
    it('should parse simple LONG format', () => {
      const signalText = `
BTCUSDT
LONG
Entry: 50000
TP: 52000
SL: 48000
Leverage: 10x
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.symbol).toBe('BTCUSDT');
      expect(signal?.direction).toBe('LONG');
    });

    it('should parse simple SHORT format', () => {
      const signalText = `
ETHUSDT SHORT
Entry: 3500
TP1: 3300
TP2: 3100
SL: 3700
      `;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.direction).toBe('SHORT');
      expect(signal?.takeProfits).toHaveLength(2);
    });

    it('should parse compact format', () => {
      const signalText = `BTCUSDT long 50000 tp 52000 sl 48000 lev 10x`;

      const signal = parseSignal(signalText);

      expect(signal).toBeDefined();
      expect(signal?.symbol).toBe('BTCUSDT');
      expect(signal?.direction).toBe('LONG');
    });
  });

  describe('Symbol Extraction', () => {
    it('should extract symbol with hash prefix', () => {
      const signal = parseSignal('#BTC/USDT LONG');
      expect(signal?.symbol).toBe('BTCUSDT');
    });

    it('should extract symbol without hash', () => {
      const signal = parseSignal('BTCUSDT LONG');
      expect(signal?.symbol).toBe('BTCUSDT');
    });

    it('should extract symbol with slash', () => {
      const signal = parseSignal('BTC/USDT LONG');
      expect(signal?.symbol).toBe('BTCUSDT');
    });

    it('should handle various quote currencies', () => {
      const signal1 = parseSignal('BTCUSDT LONG');
      const signal2 = parseSignal('ETHBUSD LONG');
      const signal3 = parseSignal('SOLUSDC LONG');

      expect(signal1?.symbol).toBe('BTCUSDT');
      expect(signal2?.symbol).toBe('ETHBUSD');
      expect(signal3?.symbol).toBe('SOLUSDC');
    });
  });

  describe('Direction Detection', () => {
    it('should detect LONG from various keywords', () => {
      const signals = [
        parseSignal('BTCUSDT long'),
        parseSignal('BTCUSDT LONG'),
        parseSignal('BTCUSDT лонг'),
        parseSignal('BTCUSDT ЛОНГ'),
        parseSignal('BTCUSDT buy'),
        parseSignal('BTCUSDT покупка'),
      ];

      signals.forEach(signal => {
        expect(signal?.direction).toBe('LONG');
      });
    });

    it('should detect SHORT from various keywords', () => {
      const signals = [
        parseSignal('BTCUSDT short'),
        parseSignal('BTCUSDT SHORT'),
        parseSignal('BTCUSDT шорт'),
        parseSignal('BTCUSDT ШОРТ'),
        parseSignal('BTCUSDT sell'),
        parseSignal('BTCUSDT продажа'),
      ];

      signals.forEach(signal => {
        expect(signal?.direction).toBe('SHORT');
      });
    });

    it('should infer direction from prices', () => {
      // Entry below TP = LONG
      const longSignal = parseSignal(`
BTCUSDT
Entry: 50000
TP: 52000
SL: 48000
      `);

      expect(longSignal?.direction).toBe('LONG');

      // Entry above TP = SHORT
      const shortSignal = parseSignal(`
BTCUSDT
Entry: 50000
TP: 48000
SL: 52000
      `);

      expect(shortSignal?.direction).toBe('SHORT');
    });
  });

  describe('Take Profit Parsing', () => {
    it('should parse single TP', () => {
      const signal = parseSignal('BTCUSDT LONG tp 52000');
      expect(signal?.takeProfits).toHaveLength(1);
      expect(signal?.takeProfits[0].price).toBe(52000);
    });

    it('should parse multiple TPs', () => {
      const signal = parseSignal(`
BTCUSDT LONG
TP1: 52000 30%
TP2: 54000 40%
TP3: 56000 30%
      `);

      expect(signal?.takeProfits).toHaveLength(3);
      expect(signal?.takeProfits[0].percentage).toBe(30);
      expect(signal?.takeProfits[1].percentage).toBe(40);
    });

    it('should parse comma-separated TPs', () => {
      const signal = parseSignal('BTCUSDT LONG TP: 52000, 54000, 56000');
      
      expect(signal?.takeProfits).toHaveLength(3);
    });
  });

  describe('Stop Loss Parsing', () => {
    it('should parse stop loss', () => {
      const signal = parseSignal('BTCUSDT LONG SL: 48000');
      expect(signal?.stopLoss).toBe(48000);
    });

    it('should parse stop loss with various keywords', () => {
      const signals = [
        parseSignal('BTCUSDT LONG sl 48000'),
        parseSignal('BTCUSDT LONG stop 48000'),
        parseSignal('BTCUSDT LONG стоп 48000'),
      ];

      signals.forEach(signal => {
        expect(signal?.stopLoss).toBe(48000);
      });
    });
  });

  describe('Leverage Parsing', () => {
    it('should parse leverage with x suffix', () => {
      const signal = parseSignal('BTCUSDT LONG leverage 10x');
      expect(signal?.leverage).toBe(10);
    });

    it('should parse leverage with X suffix', () => {
      const signal = parseSignal('BTCUSDT LONG LEV 20X');
      expect(signal?.leverage).toBe(20);
    });

    it('should parse isolated leverage', () => {
      const signal = parseSignal('BTCUSDT LONG Isolated (15X)');
      expect(signal?.leverage).toBe(15);
      expect(signal?.leverageType).toBe('ISOLATED');
    });

    it('should parse cross leverage', () => {
      const signal = parseSignal('BTCUSDT LONG Cross (10X)');
      expect(signal?.leverage).toBe(10);
      expect(signal?.leverageType).toBe('CROSS');
    });
  });

  describe('Invalid Signal Handling', () => {
    it('should return null for empty input', () => {
      const signal = parseSignal('');
      expect(signal).toBeNull();
    });

    it('should return null for random text', () => {
      const signal = parseSignal('This is just random text without any trading signal');
      expect(signal).toBeNull();
    });

    it('should return null for incomplete signal', () => {
      const signal = parseSignal('#BTC');
      expect(signal).toBeNull();
    });
  });
});

describe('Management Command Parsing', () => {
  it('should parse close command', () => {
    const command = parseManagementCommand('BTCUSDT long close');
    
    expect(command).toBeDefined();
    expect(command?.type).toBe('CLOSE_SIGNAL');
    expect(command?.symbol).toBe('BTCUSDT');
  });

  it('should parse SL update command', () => {
    const command = parseManagementCommand('BTCUSDT long sl 48000');
    
    expect(command).toBeDefined();
    expect(command?.type).toBe('UPDATE_SL');
    expect(command?.slPrice).toBe(48000);
  });

  it('should parse TP update command', () => {
    const command = parseManagementCommand('BTCUSDT short tp2 100');
    
    expect(command).toBeDefined();
    expect(command?.type).toBe('UPDATE_TP');
    expect(command?.tpIndex).toBe(2);
    expect(command?.tpPrice).toBe(100);
  });

  it('should parse ID reset command', () => {
    const command = parseManagementCommand('id reset');
    
    expect(command).toBeDefined();
    expect(command?.type).toBe('RESET_ID');
  });

  it('should parse clear base command', () => {
    const command = parseManagementCommand('clear base');
    
    expect(command).toBeDefined();
    expect(command?.type).toBe('CLEAR_BASE');
  });

  it('should parse Russian commands', () => {
    const command = parseManagementCommand('сброс id');
    
    expect(command).toBeDefined();
    expect(command?.type).toBe('RESET_ID');
  });
});
