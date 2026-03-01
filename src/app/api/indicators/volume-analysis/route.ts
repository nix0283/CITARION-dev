/**
 * Volume Analysis API Endpoint
 * Provides comprehensive volume analysis for trading data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  VolumeData,
  comprehensiveVolumeAnalysis,
  analyzeBreakoutsReversals,
  calculateVolumeDivergence,
  calculateVolumePatterns,
  analyzeVolumeConfirmation,
  calculateOBV,
  calculateVROC,
  analyzeAccumulationDistribution,
} from '@/lib/indicators/volume-analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, options = {}, analysisType = 'comprehensive' } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing data array' },
        { status: 400 }
      );
    }

    // Validate data structure
    const validData: VolumeData[] = data.map((item: Record<string, unknown>) => ({
      timestamp: item.timestamp || item.time || Date.now(),
      open: Number(item.open) || 0,
      high: Number(item.high) || 0,
      low: Number(item.low) || 0,
      close: Number(item.close) || 0,
      volume: Number(item.volume) || 0,
    }));

    const {
      lookbackPeriod = 5,
      maPeriod = 5,
      spikeThreshold = 2.0,
    } = options;

    let result: Record<string, unknown>;

    switch (analysisType) {
      case 'breakouts':
        result = {
          breakoutsReversals: analyzeBreakoutsReversals(validData, lookbackPeriod),
        };
        break;

      case 'divergence':
        result = {
          divergences: calculateVolumeDivergence(validData),
        };
        break;

      case 'patterns':
        result = {
          patterns: calculateVolumePatterns(validData, maPeriod, spikeThreshold),
        };
        break;

      case 'confirmation':
        result = {
          confirmations: analyzeVolumeConfirmation(validData),
        };
        break;

      case 'obv':
        result = {
          obv: calculateOBV(validData),
        };
        break;

      case 'vroc':
        result = {
          vroc: calculateVROC(validData, options.period || 14),
        };
        break;

      case 'accumulation':
        result = {
          accumulationDistribution: analyzeAccumulationDistribution(validData),
        };
        break;

      case 'comprehensive':
      default:
        result = comprehensiveVolumeAnalysis(validData, {
          lookbackPeriod,
          maPeriod,
          spikeThreshold,
        });
    }

    return NextResponse.json({
      success: true,
      analysisType,
      dataPoints: validData.length,
      result,
    });
  } catch (error) {
    console.error('Volume analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform volume analysis', message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    endpoint: 'Volume Analysis API',
    description: 'Comprehensive volume analysis for trading data',
    analysisTypes: [
      {
        type: 'comprehensive',
        description: 'Full volume analysis with all indicators and summary',
      },
      {
        type: 'breakouts',
        description: 'Breakout and reversal detection',
      },
      {
        type: 'divergence',
        description: 'Volume divergence analysis (bullish/bearish)',
      },
      {
        type: 'patterns',
        description: 'Volume pattern detection (spikes, accumulation)',
      },
      {
        type: 'confirmation',
        description: 'Volume confirmation of price movements',
      },
      {
        type: 'obv',
        description: 'On-Balance Volume calculation',
      },
      {
        type: 'vroc',
        description: 'Volume Rate of Change',
      },
      {
        type: 'accumulation',
        description: 'Accumulation/Distribution analysis',
      },
    ],
    options: {
      lookbackPeriod: {
        type: 'number',
        default: 5,
        description: 'Lookback period for breakouts/reversals',
      },
      maPeriod: {
        type: 'number',
        default: 5,
        description: 'Moving average period for volume patterns',
      },
      spikeThreshold: {
        type: 'number',
        default: 2.0,
        description: 'Threshold multiplier for volume spike detection',
      },
    },
    usage: {
      method: 'POST',
      body: {
        data: 'Array of OHLCV candles',
        analysisType: 'Type of analysis to perform',
        options: 'Analysis options',
      },
    },
  });
}
