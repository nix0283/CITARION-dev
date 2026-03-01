/**
 * Risk Management API Endpoint
 * Provides comprehensive risk analysis and management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  comprehensiveRiskCheck,
  calculateDrawdown,
  calculateExposures,
  calculateStopLoss,
  kellyPositionSize,
  volatilityPositionSize,
  riskParityPositionSize,
  atrPositionSize,
  calculateVaR,
  calculateCVaR,
  calculateConcentrationMetrics,
  DEFAULT_RISK_LIMITS,
  RiskLimits,
} from '@/lib/risk/management';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { analysisType = 'comprehensive', data, config = {} } = body;

    const limits: RiskLimits = { ...DEFAULT_RISK_LIMITS, ...config.limits };

    let result: Record<string, unknown>;

    switch (analysisType) {
      case 'drawdown': {
        const { portfolioValues } = data;
        if (!Array.isArray(portfolioValues)) {
          return NextResponse.json(
            { error: 'portfolioValues array required' },
            { status: 400 }
          );
        }
        result = { drawdown: calculateDrawdown(portfolioValues) };
        break;
      }

      case 'exposure': {
        const { portfolio } = data;
        if (!portfolio || !portfolio.positions) {
          return NextResponse.json(
            { error: 'portfolio with positions required' },
            { status: 400 }
          );
        }
        result = { exposures: calculateExposures(portfolio) };
        break;
      }

      case 'position_size': {
        const { method: sizeMethod, params } = data;

        switch (sizeMethod) {
          case 'kelly':
            result = { positionSize: kellyPositionSize(
              params.winRate,
              params.avgWin,
              params.avgLoss,
              params.portfolioValue,
              params.maxFraction
            ) };
            break;

          case 'volatility':
            result = { positionSize: volatilityPositionSize(
              params.targetVolatility,
              params.assetVolatility,
              params.portfolioValue,
              params.maxPosition
            ) };
            break;

          case 'risk_parity': {
            const sizes = riskParityPositionSize(
              new Map(Object.entries(params.assetVolatilities)),
              params.portfolioValue
            );
            result = { positionSizes: Object.fromEntries(sizes) };
            break;
          }

          case 'atr':
            result = { positionSize: atrPositionSize(
              params.portfolioValue,
              params.atr,
              params.price,
              params.riskPerTrade,
              params.stopLossATR
            ) };
            break;

          default:
            return NextResponse.json(
              { error: 'Invalid position sizing method' },
              { status: 400 }
            );
        }
        break;
      }

      case 'stop_loss': {
        const { position, options } = data;
        if (!position) {
          return NextResponse.json(
            { error: 'position required for stop loss calculation' },
            { status: 400 }
          );
        }
        result = { stopLosses: calculateStopLoss(position, options || {}) };
        break;
      }

      case 'var': {
        const { portfolioValue, volatility, expectedReturn, confidenceLevel } = data;
        result = {
          var: calculateVaR(portfolioValue, volatility, expectedReturn || 0, confidenceLevel || 0.95),
          cvar: calculateCVaR(portfolioValue, volatility, expectedReturn || 0, confidenceLevel || 0.95),
        };
        break;
      }

      case 'concentration': {
        const { positions, portfolioValue } = data;
        if (!positions || !portfolioValue) {
          return NextResponse.json(
            { error: 'positions and portfolioValue required' },
            { status: 400 }
          );
        }
        result = { concentration: calculateConcentrationMetrics(positions, portfolioValue) };
        break;
      }

      case 'comprehensive':
      default: {
        const { portfolio, historicalValues, returns, volatilities, correlations, stopOptions } = data;

        if (!portfolio || !historicalValues) {
          return NextResponse.json(
            { error: 'portfolio and historicalValues required for comprehensive analysis' },
            { status: 400 }
          );
        }

        result = comprehensiveRiskCheck(
          portfolio,
          historicalValues,
          returns || [],
          {
            limits,
            volatilities: volatilities ? new Map(Object.entries(volatilities)) : undefined,
            correlations: correlations ? new Map(
              Object.entries(correlations).map(([k, v]) => [k, new Map(Object.entries(v as Record<string, number>))])
            ) : undefined,
            stopOptions: stopOptions ? new Map(Object.entries(stopOptions)) : undefined,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      analysisType,
      result,
    });
  } catch (error) {
    console.error('Risk management analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform risk analysis', message: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    endpoint: 'Risk Management API',
    description: 'Comprehensive risk analysis and management inspired by QuantConnect LEAN',
    analysisTypes: [
      {
        type: 'comprehensive',
        description: 'Full risk check with all metrics and actions',
        required: ['portfolio', 'historicalValues'],
      },
      {
        type: 'drawdown',
        description: 'Calculate drawdown metrics',
        required: ['portfolioValues'],
      },
      {
        type: 'exposure',
        description: 'Calculate portfolio exposures',
        required: ['portfolio'],
      },
      {
        type: 'position_size',
        description: 'Calculate optimal position size',
        required: ['method', 'params'],
        methods: ['kelly', 'volatility', 'risk_parity', 'atr'],
      },
      {
        type: 'stop_loss',
        description: 'Calculate stop loss levels',
        required: ['position'],
      },
      {
        type: 'var',
        description: 'Calculate Value at Risk',
        required: ['portfolioValue', 'volatility'],
      },
      {
        type: 'concentration',
        description: 'Calculate concentration metrics',
        required: ['positions', 'portfolioValue'],
      },
    ],
    defaultLimits: DEFAULT_RISK_LIMITS,
    usage: {
      method: 'POST',
      body: {
        analysisType: 'Type of analysis to perform',
        data: 'Analysis-specific data',
        config: { limits: 'Risk limits configuration' },
      },
    },
  });
}
