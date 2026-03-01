/**
 * Trend Analysis API Endpoint
 * Provides linear regression-based trend analysis for trading data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TrendData,
  comprehensiveTrendAnalysis,
  analyzeTrend,
  analyzeTrendHistory,
  identifyTrendLines,
  detectTrendReversal,
  multiTimeframeTrendAnalysis,
  linearRegression,
} from '@/lib/indicators/trend-analysis';

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
    const validData: TrendData[] = data.map((item: Record<string, unknown>) => ({
      timestamp: item.timestamp || item.time || Date.now(),
      open: Number(item.open) || 0,
      high: Number(item.high) || 0,
      low: Number(item.low) || 0,
      close: Number(item.close) || 0,
      volume: Number(item.volume) || 0,
    }));

    const {
      period = 20,
      step = 5,
      trendLineLookback = 50,
      touchThreshold = 0.02,
      timeframes = [10, 20, 50, 100],
    } = options;

    let result: Record<string, unknown>;

    switch (analysisType) {
      case 'basic':
        result = {
          trend: analyzeTrend(validData, period),
        };
        break;

      case 'history':
        result = {
          trendHistory: analyzeTrendHistory(validData, period, step),
        };
        break;

      case 'trendlines':
        result = {
          trendLines: identifyTrendLines(validData, trendLineLookback, touchThreshold),
        };
        break;

      case 'reversal': {
        const trendHistory = analyzeTrendHistory(validData, period, step);
        result = {
          reversal: detectTrendReversal(trendHistory),
        };
        break;
      }

      case 'multi-timeframe':
        result = {
          multiTimeframe: multiTimeframeTrendAnalysis(validData, timeframes),
        };
        break;

      case 'regression': {
        const xValues = validData.map((_, i) => i);
        const yValues = validData.map(d => d.close);
        result = {
          regression: linearRegression(xValues, yValues),
        };
        break;
      }

      case 'comprehensive':
      default:
        result = comprehensiveTrendAnalysis(validData, {
          period,
          step,
          trendLineLookback,
          touchThreshold,
        });
    }

    return NextResponse.json({
      success: true,
      analysisType,
      dataPoints: validData.length,
      result,
    });
  } catch (error) {
    console.error('Trend analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform trend analysis', message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    endpoint: 'Trend Analysis API',
    description: 'Linear regression-based trend analysis for trading data',
    analysisTypes: [
      {
        type: 'comprehensive',
        description: 'Full trend analysis with all components',
      },
      {
        type: 'basic',
        description: 'Basic trend determination using linear regression',
      },
      {
        type: 'history',
        description: 'Trend analysis over rolling periods',
      },
      {
        type: 'trendlines',
        description: 'Identify support and resistance trend lines',
      },
      {
        type: 'reversal',
        description: 'Detect potential trend reversals',
      },
      {
        type: 'multi-timeframe',
        description: 'Analyze trends across multiple timeframes',
      },
      {
        type: 'regression',
        description: 'Raw linear regression calculation',
      },
    ],
    options: {
      period: {
        type: 'number',
        default: 20,
        description: 'Period for trend analysis',
      },
      step: {
        type: 'number',
        default: 5,
        description: 'Step size for trend history',
      },
      trendLineLookback: {
        type: 'number',
        default: 50,
        description: 'Lookback period for trend line detection',
      },
      touchThreshold: {
        type: 'number',
        default: 0.02,
        description: 'Threshold for trend line touch detection',
      },
      timeframes: {
        type: 'number[]',
        default: [10, 20, 50, 100],
        description: 'Timeframes for multi-timeframe analysis',
      },
    },
    usage: {
      method: 'POST',
      body: {
        data: 'Array of OHLC candles',
        analysisType: 'Type of analysis to perform',
        options: 'Analysis options',
      },
    },
  });
}
