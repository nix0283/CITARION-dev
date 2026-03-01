/**
 * Dow Theory Analysis API Endpoint
 * Provides Dow Theory-based trend analysis for trading data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  DowTheoryData,
  analyzeDowTheory,
  identifyPeaksTroughs,
  determinePrimaryTrend,
  identifySecondaryTrend,
  identifyTrendPhase,
  generateDowSignals,
  checkVolumeConfirmation,
} from '@/lib/indicators/dow-theory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, indexData, options = {}, analysisType = 'comprehensive' } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing data array' },
        { status: 400 }
      );
    }

    // Validate data structure
    const validData: DowTheoryData[] = data.map((item: Record<string, unknown>) => ({
      timestamp: item.timestamp || item.time || Date.now(),
      open: Number(item.open) || 0,
      high: Number(item.high) || 0,
      low: Number(item.low) || 0,
      close: Number(item.close) || 0,
      volume: Number(item.volume) || 0,
    }));

    // Validate index data if provided
    let validIndexData: DowTheoryData[] | undefined;
    if (indexData && Array.isArray(indexData) && indexData.length > 0) {
      validIndexData = indexData.map((item: Record<string, unknown>) => ({
        timestamp: item.timestamp || item.time || Date.now(),
        open: Number(item.open) || 0,
        high: Number(item.high) || 0,
        low: Number(item.low) || 0,
        close: Number(item.close) || 0,
        volume: Number(item.volume) || 0,
      }));
    }

    const {
      smaPeriod = 50,
      peakTroughLookback = 3,
      volumeLookback = 10,
    } = options;

    let result: Record<string, unknown>;

    switch (analysisType) {
      case 'peaks-troughs':
        result = {
          peaksTroughs: identifyPeaksTroughs(validData, peakTroughLookback),
        };
        break;

      case 'primary-trend': {
        const peaksTroughs = identifyPeaksTroughs(validData, peakTroughLookback);
        result = {
          primaryTrend: determinePrimaryTrend(peaksTroughs),
        };
        break;
      }

      case 'secondary-trend': {
        const peaksTroughs = identifyPeaksTroughs(validData, peakTroughLookback);
        const primaryTrend = determinePrimaryTrend(peaksTroughs);
        result = {
          secondaryTrend: identifySecondaryTrend(validData, primaryTrend.trend, smaPeriod),
        };
        break;
      }

      case 'trend-phase': {
        const peaksTroughs = identifyPeaksTroughs(validData, peakTroughLookback);
        const primaryTrend = determinePrimaryTrend(peaksTroughs);
        result = {
          trendPhase: identifyTrendPhase(validData, peaksTroughs, primaryTrend.trend),
        };
        break;
      }

      case 'signals': {
        const peaksTroughs = identifyPeaksTroughs(validData, peakTroughLookback);
        const primaryTrend = determinePrimaryTrend(peaksTroughs);
        result = {
          signals: generateDowSignals(validData, peaksTroughs, primaryTrend.trend),
        };
        break;
      }

      case 'volume-confirm': {
        const peaksTroughs = identifyPeaksTroughs(validData, peakTroughLookback);
        const primaryTrend = determinePrimaryTrend(peaksTroughs);
        result = {
          volumeConfirmation: checkVolumeConfirmation(validData, primaryTrend.trend, volumeLookback),
        };
        break;
      }

      case 'comprehensive':
      default:
        result = analyzeDowTheory(validData, validIndexData, {
          smaPeriod,
          peakTroughLookback,
          volumeLookback,
        });
    }

    return NextResponse.json({
      success: true,
      analysisType,
      dataPoints: validData.length,
      result,
    });
  } catch (error) {
    console.error('Dow Theory analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Dow Theory analysis', message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    endpoint: 'Dow Theory Analysis API',
    description: 'Dow Theory-based trend analysis for trading data',
    analysisTypes: [
      {
        type: 'comprehensive',
        description: 'Full Dow Theory analysis with all components',
      },
      {
        type: 'peaks-troughs',
        description: 'Identify market peaks and troughs',
      },
      {
        type: 'primary-trend',
        description: 'Determine primary market trend',
      },
      {
        type: 'secondary-trend',
        description: 'Identify secondary trend (corrections/rallies)',
      },
      {
        type: 'trend-phase',
        description: 'Identify current trend phase (accumulation/participation/distribution)',
      },
      {
        type: 'signals',
        description: 'Generate buy/sell signals based on Dow Theory',
      },
      {
        type: 'volume-confirm',
        description: 'Check volume confirmation of trend',
      },
    ],
    options: {
      smaPeriod: {
        type: 'number',
        default: 50,
        description: 'SMA period for trend confirmation',
      },
      peakTroughLookback: {
        type: 'number',
        default: 3,
        description: 'Lookback period for peak/trough identification',
      },
      volumeLookback: {
        type: 'number',
        default: 10,
        description: 'Lookback period for volume confirmation',
      },
    },
    usage: {
      method: 'POST',
      body: {
        data: 'Array of OHLCV candles',
        indexData: 'Optional array of market index data',
        analysisType: 'Type of analysis to perform',
        options: 'Analysis options',
      },
    },
  });
}
