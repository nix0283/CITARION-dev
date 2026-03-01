import { NextRequest, NextResponse } from 'next/server';
import * as talib from '@/lib/indicators/talib-port';
import {
  scanExtendedPatterns,
  detectExtendedPattern,
  EXTENDED_CANDLESTICK_PATTERNS,
} from '@/lib/indicators/talib-candlestick';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'indicator': {
        const { functionName, ...args } = params;
        
        if (!functionName || typeof talib[functionName as keyof typeof talib] !== 'function') {
          return NextResponse.json(
            { error: `Unknown function: ${functionName}` },
            { status: 400 }
          );
        }
        
        const fn = talib[functionName as keyof typeof talib] as (...args: unknown[]) => unknown;
        const result = fn(...Object.values(args));
        
        return NextResponse.json({
          success: true,
          function: functionName,
          result,
        });
      }

      case 'batch': {
        const { functions } = params as { functions: Array<{ name: string; params: Record<string, unknown> }> };
        
        const results: Record<string, unknown> = {};
        
        for (const { name, params: fnParams } of functions) {
          if (typeof talib[name as keyof typeof talib] === 'function') {
            const fn = talib[name as keyof typeof talib] as (...args: unknown[]) => unknown;
            results[name] = fn(...Object.values(fnParams));
          }
        }
        
        return NextResponse.json({
          success: true,
          results,
        });
      }

      case 'candlestick': {
        const { candles, index, trend } = params as {
          candles: Array<{ open: number; high: number; low: number; close: number; volume?: number; time?: number }>;
          index?: number;
          trend?: boolean;
        };
        
        if (!candles || candles.length === 0) {
          return NextResponse.json(
            { error: 'Candles array is required' },
            { status: 400 }
          );
        }
        
        if (typeof index === 'number') {
          // Detect pattern at specific index
          const patternCode = detectExtendedPattern(candles, index, trend);
          const pattern = patternCode ? EXTENDED_CANDLESTICK_PATTERNS[patternCode] : null;
          
          return NextResponse.json({
            success: true,
            index,
            pattern: pattern ? {
              ...pattern,
              price: candles[index].close,
            } : null,
          });
        }
        
        // Scan all candles
        const patterns = scanExtendedPatterns(candles, trend);
        
        return NextResponse.json({
          success: true,
          count: patterns.length,
          patterns: patterns.map(p => ({
            code: p.code,
            name: EXTENDED_CANDLESTICK_PATTERNS[p.code]?.name || p.code,
            type: EXTENDED_CANDLESTICK_PATTERNS[p.code]?.type,
            reliability: EXTENDED_CANDLESTICK_PATTERNS[p.code]?.reliability,
            index: p.index,
            price: p.candle.close,
          })),
        });
      }

      case 'analyze': {
        const { candles } = params as {
          candles: Array<{ open: number; high: number; low: number; close: number; volume?: number; time?: number }>;
        };
        
        if (!candles || candles.length < 30) {
          return NextResponse.json(
            { error: 'At least 30 candles required for analysis' },
            { status: 400 }
          );
        }
        
        const close = candles.map(c => c.close);
        const high = candles.map(c => c.high);
        const low = candles.map(c => c.low);
        const volume = candles.map(c => c.volume || 0);
        
        // Calculate multiple indicators
        const getLastValue = (arr: number[] | { mama: number[]; fama: number[] } | null) => {
          if (!arr) return null;
          if (Array.isArray(arr)) {
            const validValues = arr.filter(v => !isNaN(v));
            return validValues[validValues.length - 1] || null;
          }
          return {
            mama: arr.mama.filter(v => !isNaN(v)).slice(-1)[0] || null,
            fama: arr.fama.filter(v => !isNaN(v)).slice(-1)[0] || null,
          };
        };
        
        const analysis = {
          price: {
            last: close[close.length - 1],
            change: close[close.length - 1] - close[close.length - 2],
            changePercent: ((close[close.length - 1] / close[close.length - 2]) - 1) * 100,
          },
          indicators: {
            sma20: getLastValue(talib.SMA(close, 20)),
            sma50: getLastValue(talib.SMA(close, 50)),
            ema20: getLastValue(talib.EMA(close, 20)),
            kama: getLastValue(talib.KAMA(close, 10, 2, 30)),
            atr: getLastValue(talib.ATR(high, low, close, 14)),
            cmo: getLastValue(talib.CMO(close, 14)),
            willr: getLastValue(talib.WILLR(high, low, close, 14)),
            adx: getLastValue(talib.ADX(high, low, close, 14)),
            mfi: getLastValue(talib.MFI(high, low, close, volume, 14)),
          },
          candlesticks: scanExtendedPatterns(candles).slice(-10),
        };
        
        return NextResponse.json({
          success: true,
          analysis,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('TA-Lib API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  
  // Return available functions
  const functions = Object.entries(talib.TALIB_FUNCTIONS).map(([code, info]) => ({
    code,
    name: info.name,
    category: info.category,
    inputs: info.inputs,
  }));
  
  if (category) {
    const filtered = functions.filter(f => f.category === category);
    return NextResponse.json({
      success: true,
      category,
      functions: filtered,
      count: filtered.length,
    });
  }
  
  // Group by category
  const grouped = functions.reduce((acc, fn) => {
    if (!acc[fn.category]) acc[fn.category] = [];
    acc[fn.category].push(fn);
    return acc;
  }, {} as Record<string, typeof functions>);
  
  // Add extended candlestick patterns
  const candlestickPatterns = Object.entries(EXTENDED_CANDLESTICK_PATTERNS).map(([code, info]) => ({
    code,
    name: info.name,
    category: 'candlestick',
    type: info.type,
    reliability: info.reliability,
    candlesRequired: info.candlesRequired,
  }));
  
  return NextResponse.json({
    success: true,
    functions: {
      ...grouped,
      candlestick: candlestickPatterns,
    },
    categories: {
      overlap: 'Moving Averages',
      momentum: 'Momentum Indicators',
      volume: 'Volume Indicators',
      volatility: 'Volatility Indicators',
      trend: 'Trend Indicators',
      price: 'Price Transform',
      statistic: 'Statistic Functions',
      cycle: 'Cycle Indicators',
      candlestick: 'Candlestick Patterns',
    },
    totalFunctions: functions.length + candlestickPatterns.length,
  });
}
