import { NextRequest, NextResponse } from 'next/server';
import {
  OHLCVCandle,
  scanPatterns,
  detectPattern,
  getPatternStatistics,
  CANDLESTICK_PATTERNS,
  PatternDetectionOptions,
} from '@/lib/indicators/candlestick-patterns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candles, options, action = 'scan' } = body as {
      candles: OHLCVCandle[];
      options?: PatternDetectionOptions;
      action?: 'scan' | 'detect' | 'stats';
    };

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return NextResponse.json(
        { error: 'Candles array is required' },
        { status: 400 }
      );
    }

    // Validate candle data
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      if (
        typeof candle.open !== 'number' ||
        typeof candle.high !== 'number' ||
        typeof candle.low !== 'number' ||
        typeof candle.close !== 'number'
      ) {
        return NextResponse.json(
          { error: `Invalid candle data at index ${i}` },
          { status: 400 }
        );
      }
    }

    switch (action) {
      case 'detect': {
        // Detect pattern at specific index
        const { index } = body;
        if (typeof index !== 'number') {
          return NextResponse.json(
            { error: 'Index is required for detect action' },
            { status: 400 }
          );
        }
        
        const patternCode = detectPattern(candles, index, options);
        const pattern = patternCode ? CANDLESTICK_PATTERNS[patternCode] : null;
        
        return NextResponse.json({
          success: true,
          index,
          pattern: pattern
            ? {
                ...pattern,
                price: candles[index].close,
                timestamp: candles[index].time,
              }
            : null,
        });
      }

      case 'stats': {
        // Get pattern statistics
        const results = scanPatterns(candles, options);
        const stats = getPatternStatistics(results);
        
        return NextResponse.json({
          success: true,
          totalPatterns: results.length,
          statistics: stats,
          bullishCount: results.filter(r => r.pattern.type === 'bullish').length,
          bearishCount: results.filter(r => r.pattern.type === 'bearish').length,
        });
      }

      case 'scan':
      default: {
        // Scan all candles for patterns
        const results = scanPatterns(candles, options);
        
        return NextResponse.json({
          success: true,
          count: results.length,
          patterns: results.map(r => ({
            code: r.pattern.code,
            name: r.pattern.name,
            type: r.pattern.type,
            reliability: r.pattern.reliability,
            timestamp: r.timestamp,
            price: r.price,
            confidence: r.confidence,
          })),
        });
      }
    }
  } catch (error) {
    console.error('Candlestick pattern detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect patterns', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Return available patterns
  const patterns = Object.values(CANDLESTICK_PATTERNS).map(p => ({
    code: p.code,
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    reliability: p.reliability,
    candlesRequired: p.candlesRequired,
  }));

  return NextResponse.json({
    success: true,
    patterns,
    totalPatterns: patterns.length,
    bullishPatterns: patterns.filter(p => p.type === 'bullish').length,
    bearishPatterns: patterns.filter(p => p.type === 'bearish').length,
  });
}
