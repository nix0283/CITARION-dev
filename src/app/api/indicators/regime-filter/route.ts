/**
 * Regime Filter API Endpoint
 * Provides ADX, TNI, and comprehensive regime analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateADX,
  calculateTNI,
  detectRegime,
  applyRegimeFilter,
  calculateIchimokuConfirmation,
  comprehensiveRegimeAnalysis,
  DEFAULT_REGIME_CONFIG,
  type RegimeFilterConfig,
} from '@/lib/indicators/regime-filter';

export async function GET() {
  return NextResponse.json({
    name: 'Regime Filter API',
    description: 'Market regime detection using ADX and TNI',
    version: '1.0.0',
    endpoints: {
      'POST /': 'Perform regime analysis',
    },
    analysisTypes: {
      comprehensive: 'Full regime analysis with ADX, TNI, and recommendations',
      adx: 'ADX-only analysis',
      tni: 'TNI-only analysis',
      filter: 'Apply regime filter to a trading signal',
      ichimoku_confirm: 'Calculate Ichimoku confirmation score',
    },
    defaultConfig: DEFAULT_REGIME_CONFIG,
    example: {
      analysisType: 'comprehensive',
      candles: [
        { time: 1640000000, open: 50000, high: 51000, low: 49500, close: 50500 },
      ],
      config: {
        adxPeriod: 14,
        adxStrongTrend: 25,
        tniPeriod: 14,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      analysisType = 'comprehensive',
      candles,
      config = {},
      signalDirection,
      ichimokuData,
    } = body;

    // Validate candles
    if (!candles || !Array.isArray(candles) || candles.length < 30) {
      return NextResponse.json(
        {
          error: 'Invalid candles data. Need at least 30 candles for meaningful analysis.',
          minCandles: 30,
          received: candles?.length ?? 0,
        },
        { status: 400 }
      );
    }

    // Parse candles
    const parsedCandles = candles.map((c: { time: number; open: string | number; high: string | number; low: string | number; close: string | number }) => ({
      time: c.time,
      open: parseFloat(String(c.open)),
      high: parseFloat(String(c.high)),
      low: parseFloat(String(c.low)),
      close: parseFloat(String(c.close)),
    }));

    // Merge config with defaults
    const mergedConfig: Partial<RegimeFilterConfig> = {
      ...DEFAULT_REGIME_CONFIG,
      ...config,
    };

    switch (analysisType) {
      case 'adx':
        return NextResponse.json({
          success: true,
          analysisType: 'adx',
          result: calculateADX(parsedCandles, mergedConfig),
        });

      case 'tni':
        return NextResponse.json({
          success: true,
          analysisType: 'tni',
          result: calculateTNI(parsedCandles, mergedConfig),
        });

      case 'filter':
        // Apply regime filter to a signal
        if (!signalDirection || !['long', 'short'].includes(signalDirection)) {
          return NextResponse.json(
            {
              error: 'signalDirection must be "long" or "short" for filter analysis',
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          analysisType: 'filter',
          result: applyRegimeFilter(
            parsedCandles,
            signalDirection,
            mergedConfig,
            ichimokuData
          ),
        });

      case 'ichimoku_confirm':
        // Calculate Ichimoku confirmation
        if (!ichimokuData) {
          return NextResponse.json(
            {
              error: 'ichimokuData is required for ichimoku_confirm analysis',
              required: ['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou'],
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          analysisType: 'ichimoku_confirm',
          result: calculateIchimokuConfirmation(parsedCandles, ichimokuData),
        });

      case 'comprehensive':
      default:
        // Full comprehensive analysis
        return NextResponse.json({
          success: true,
          analysisType: 'comprehensive',
          result: comprehensiveRegimeAnalysis(parsedCandles, mergedConfig),
        });
    }
  } catch (error) {
    console.error('Regime Filter API Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
