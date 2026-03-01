/**
 * API Endpoint: Chart Pattern Detection
 *
 * Detects chart patterns in OHLC data using algorithmic methods (no AI/ML)
 *
 * GET /api/indicators/chart-patterns
 * POST /api/indicators/chart-patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  detectAllChartPatterns,
  OHLC,
  ChartPatternsConfig,
  PatternType,
  PATTERN_DESCRIPTIONS,
  PatternResult,
} from '@/lib/indicators/chart-patterns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get configuration from query params
    const config: Partial<ChartPatternsConfig> = {
      lookback: parseInt(searchParams.get('lookback') || '60'),
      pivotInterval: parseInt(searchParams.get('pivotInterval') || '5'),
      minRSquared: parseFloat(searchParams.get('minRSquared') || '0.85'),
      maxFlatSlope: parseFloat(searchParams.get('maxFlatSlope') || '0.0001'),
      doubleRatio: parseFloat(searchParams.get('doubleRatio') || '0.02'),
      headShoulderRatio: parseFloat(searchParams.get('headShoulderRatio') || '0.002'),
    };

    // Get pattern types to detect
    const patternTypes = searchParams.get('patterns')?.split(',') as PatternType[] | undefined;

    // Return configuration and available patterns
    return NextResponse.json({
      success: true,
      config,
      availablePatterns: Object.entries(PATTERN_DESCRIPTIONS).map(([key, value]) => ({
        type: key,
        ...value,
      })),
      requestedPatterns: patternTypes || 'all',
    });
  } catch (error) {
    console.error('Chart patterns API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { success: false, error: 'OHLC data array is required' },
        { status: 400 }
      );
    }

    const data: OHLC[] = body.data;

    // Validate OHLC structure
    if (data.length < 20) {
      return NextResponse.json(
        { success: false, error: 'At least 20 candles are required for pattern detection' },
        { status: 400 }
      );
    }

    // Validate each candle
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      if (
        typeof candle.open !== 'number' ||
        typeof candle.high !== 'number' ||
        typeof candle.low !== 'number' ||
        typeof candle.close !== 'number'
      ) {
        return NextResponse.json(
          { success: false, error: `Invalid OHLC data at index ${i}` },
          { status: 400 }
        );
      }
    }

    // Get configuration
    const config: Partial<ChartPatternsConfig> = {
      lookback: body.lookback ?? 60,
      pivotInterval: body.pivotInterval ?? 5,
      minRSquared: body.minRSquared ?? 0.85,
      maxFlatSlope: body.maxFlatSlope ?? 0.0001,
      doubleRatio: body.doubleRatio ?? 0.02,
      headShoulderRatio: body.headShoulderRatio ?? 0.002,
    };

    // Detect patterns
    const result = detectAllChartPatterns(data, config);

    // Filter by pattern types if specified
    let filteredPatterns = result.patterns;
    if (body.patterns && Array.isArray(body.patterns) && body.patterns.length > 0) {
      const types = body.patterns as PatternType[];
      filteredPatterns = result.patterns.filter(p => types.includes(p.type));
    }

    // Filter by direction if specified
    if (body.direction && ['bullish', 'bearish', 'neutral'].includes(body.direction)) {
      filteredPatterns = filteredPatterns.filter(p => p.direction === body.direction);
    }

    // Filter by minimum confidence if specified
    if (typeof body.minConfidence === 'number') {
      filteredPatterns = filteredPatterns.filter(p => p.confidence >= body.minConfidence);
    }

    // Add descriptions to patterns
    const patternsWithDescriptions = filteredPatterns.map(pattern => ({
      ...pattern,
      description: PATTERN_DESCRIPTIONS[pattern.type],
    }));

    // Get latest patterns (within last 20% of data)
    const threshold = Math.floor(data.length * 0.8);
    const latestPatterns = filteredPatterns.filter(p => p.endIndex >= threshold);

    // Prepare response
    const response = {
      success: true,
      totalCandles: data.length,
      config,
      summary: {
        totalPatterns: filteredPatterns.length,
        byDirection: {
          bullish: filteredPatterns.filter(p => p.direction === 'bullish').length,
          bearish: filteredPatterns.filter(p => p.direction === 'bearish').length,
          neutral: filteredPatterns.filter(p => p.direction === 'neutral').length,
        },
        byType: Object.fromEntries(
          Object.entries(result.byType).map(([type, patterns]) => [
            type,
            (patterns as PatternResult[]).length,
          ])
        ) as Record<PatternType, number>,
      },
      patterns: patternsWithDescriptions,
      pivots: body.includePivots ? result.pivots : undefined,
      latestPatterns,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chart patterns detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect chart patterns' },
      { status: 500 }
    );
  }
}
