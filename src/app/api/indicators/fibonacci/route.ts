/**
 * API Endpoint: Fibonacci Retracement Analysis
 *
 * Detects Fibonacci retracement levels in OHLC data
 *
 * GET /api/indicators/fibonacci
 * POST /api/indicators/fibonacci
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeFibonacci,
  detectFibonacciRetracement,
  calculateFibonacciLevels,
  findSwingHighs,
  findSwingLows,
  findDrawdownPeriods,
  OHLC,
  FibonacciConfig,
  FIBONACCI_LEVELS,
} from '@/lib/indicators/fibonacci';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get configuration from query params
    const config: Partial<FibonacciConfig> = {
      swingThreshold: parseFloat(searchParams.get('swingThreshold') || '0.03'),
      drawdownCriteria: parseFloat(searchParams.get('drawdownCriteria') || '0.15'),
      recoveryCriteria: parseFloat(searchParams.get('recoveryCriteria') || '0.02'),
      includeExtensions: searchParams.get('includeExtensions') !== 'false',
      lookback: parseInt(searchParams.get('lookback') || '100'),
    };

    // Return configuration and available levels
    return NextResponse.json({
      success: true,
      config,
      availableLevels: {
        retracement: FIBONACCI_LEVELS.retracement,
        extension: FIBONACCI_LEVELS.extension,
      },
      descriptions: {
        retracement: 'Fibonacci retracement levels (0% to 100%)',
        extension: 'Fibonacci extension levels (beyond 100%)',
        goldenRatio: 'The 61.8% level is considered the most significant for reversals',
      },
      usage: {
        endpoint: 'POST /api/indicators/fibonacci',
        body: {
          data: 'OHLC array [{time, open, high, low, close}, ...]',
          config: 'Optional configuration object',
        },
      },
    });
  } catch (error) {
    console.error('Fibonacci API error:', error);
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
        { success: false, error: 'At least 20 candles are required for Fibonacci analysis' },
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
    const config: Partial<FibonacciConfig> = {
      swingThreshold: body.swingThreshold ?? 0.03,
      drawdownCriteria: body.drawdownCriteria ?? 0.15,
      recoveryCriteria: body.recoveryCriteria ?? 0.02,
      includeExtensions: body.includeExtensions ?? true,
      lookback: body.lookback ?? 100,
    };

    // Perform analysis
    const analysis = analyzeFibonacci(data, config);

    // Get additional details if requested
    let additionalDetails = {};

    if (body.includeSwings) {
      additionalDetails = {
        ...additionalDetails,
        swingPoints: {
          highsCount: analysis.swingPoints.highs.length,
          lowsCount: analysis.swingPoints.lows.length,
          recentHighs: analysis.swingPoints.highs.slice(-5),
          recentLows: analysis.swingPoints.lows.slice(-5),
        },
      };
    }

    if (body.includeDrawdowns) {
      additionalDetails = {
        ...additionalDetails,
        drawdownsSummary: analysis.drawdowns.map(d => ({
          drawdownPercent: (d.drawdownPercent * 100).toFixed(2) + '%',
          recovered: d.recovered,
          duration: d.endIndex - d.startIndex,
        })),
      };
    }

    // Calculate levels for specific high/low if provided
    let customLevels = null;
    if (body.customHigh && body.customLow) {
      customLevels = calculateFibonacciLevels(
        body.customHigh,
        body.customLow,
        config.includeExtensions
      );
    }

    // Prepare response
    const response = {
      success: true,
      totalCandles: data.length,
      config,
      summary: analysis.summary,
      retracement: analysis.retracement ? {
        direction: analysis.retracement.direction,
        priceRange: analysis.retracement.priceRange,
        currentLevel: analysis.retracement.currentLevel,
        goldenRatio: analysis.retracement.goldenRatio,
        nearestSupport: analysis.retracement.nearestSupport,
        nearestResistance: analysis.retracement.nearestResistance,
        swingHigh: {
          index: analysis.retracement.swingHigh.index,
          value: analysis.retracement.swingHigh.value,
        },
        swingLow: {
          index: analysis.retracement.swingLow.index,
          value: analysis.retracement.swingLow.value,
        },
        levels: analysis.retracement.levels,
      } : null,
      zones: analysis.zones.slice(0, 5), // Top 5 zones
      signals: analysis.signals.slice(0, 10), // Top 10 signals
      customLevels,
      ...additionalDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fibonacci analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform Fibonacci analysis' },
      { status: 500 }
    );
  }
}
