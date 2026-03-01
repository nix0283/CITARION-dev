/**
 * ORION - Cash-and-Carry Arbitrage Bot
 * 
 * Named after the hunter constellation, this bot captures risk-free
 * arbitrage between spot and futures markets.
 * 
 * Features:
 * - Basis (premium/discount) monitoring
 * - Cash-and-carry execution
 * - Reverse cash-and-carry
 * - Funding rate optimization
 * - Perpetual vs futures arb
 * - Cross-exchange arb
 * - Exit timing optimization
 */

export type ArbType = 'CASH_AND_CARRY' | 'REVERSE_CASH_AND_CARRY' | 'FUNDING_ARB' | 'BASIS_ARB';
export type ArbStatus = 'SCANNING' | 'OPPORTUNITY' | 'EXECUTING' | 'ACTIVE' | 'EXITING' | 'CLOSED';

export interface BasisOpportunity {
  spotSymbol: string;
  futuresSymbol: string;
  exchange: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;           // Absolute basis
  basisPercent: number;    // Basis as % of spot
  fundingRate: number;
  expectedReturn: number;  // Annualized
  expiryDays: number;
  arbType: ArbType;
  confidence: number;
  timestamp: number;
}

export interface ArbPosition {
  id: string;
  opportunity: BasisOpportunity;
  spotQuantity: number;
  futuresQuantity: number;
  spotEntryPrice: number;
  futuresEntryPrice: number;
  entryBasis: number;
  currentBasis: number;
  unrealizedPnl: number;
  fundingCaptured: number;
  openedAt: number;
  targetExitDate: number;
  status: ArbStatus;
}

export interface OrionConfig {
  minBasisPercent: number;      // Minimum basis to trigger
  minFundingRate: number;       // Minimum funding for funding arb
  maxExpiryDays: number;        // Max days to expiry
  minCapital: number;           // Minimum position size
  maxCapital: number;           // Maximum position size
  targetReturnPercent: number;  // Target annualized return
  stopLossPercent: number;      // Stop loss on basis reversal
  checkIntervalMs: number;
  exchanges: string[];
}

export const DEFAULT_ORION_CONFIG: OrionConfig = {
  minBasisPercent: 0.5,         // 0.5% minimum basis
  minFundingRate: 0.001,        // 0.1% funding rate
  maxExpiryDays: 90,
  minCapital: 1000,
  maxCapital: 50000,
  targetReturnPercent: 15,      // 15% annualized
  stopLossPercent: 1.0,
  checkIntervalMs: 60000,
  exchanges: ['binance', 'bybit', 'okx'],
};

export class OrionBot {
  private config: OrionConfig;
  private opportunities: Map<string, BasisOpportunity> = new Map();
  private positions: Map<string, ArbPosition> = new Map();
  private basisHistory: Map<string, number[]> = new Map();

  constructor(config: Partial<OrionConfig>) {
    this.config = { ...DEFAULT_ORION_CONFIG, ...config };
  }

  /**
   * Scan for arbitrage opportunities
   */
  scan(
    spotPrices: Map<string, number>,
    futuresPrices: Map<string, number>,
    fundingRates: Map<string, number>
  ): BasisOpportunity[] {
    const opportunities: BasisOpportunity[] = [];

    for (const [spotSymbol, spotPrice] of spotPrices) {
      // Derive futures symbol (e.g., BTCUSDT -> BTCUSDT_PERP or BTCUSD_PERP)
      const futuresSymbol = this.deriveFuturesSymbol(spotSymbol);
      const futuresPrice = futuresPrices.get(futuresSymbol);
      const fundingRate = fundingRates.get(futuresSymbol) || 0;

      if (!futuresPrice) continue;

      const basis = futuresPrice - spotPrice;
      const basisPercent = (basis / spotPrice) * 100;

      // Annualized return calculation
      const dailyReturn = basisPercent / 365;
      const annualizedReturn = (1 + dailyReturn) ** 365 - 1;

      // Determine arb type
      let arbType: ArbType;
      if (futuresPrice > spotPrice) {
        arbType = 'CASH_AND_CARRY'; // Buy spot, sell futures
      } else {
        arbType = 'REVERSE_CASH_AND_CARRY'; // Sell spot (short), buy futures
      }

      // Check if meets minimum criteria
      if (Math.abs(basisPercent) < this.config.minBasisPercent) continue;

      const opportunity: BasisOpportunity = {
        spotSymbol,
        futuresSymbol,
        exchange: this.config.exchanges[0],
        spotPrice,
        futuresPrice,
        basis,
        basisPercent,
        fundingRate,
        expectedReturn: annualizedReturn * 100,
        expiryDays: this.config.maxExpiryDays,
        arbType,
        confidence: this.calculateConfidence(basisPercent, fundingRate),
        timestamp: Date.now(),
      };

      const key = `${spotSymbol}/${futuresSymbol}`;
      this.opportunities.set(key, opportunity);

      // Track basis history
      const history = this.basisHistory.get(key) || [];
      history.push(basisPercent);
      if (history.length > 100) history.shift();
      this.basisHistory.set(key, history);

      opportunities.push(opportunity);
    }

    return opportunities.sort((a, b) => b.expectedReturn - a.expectedReturn);
  }

  /**
   * Execute cash-and-carry
   */
  executeCashAndCarry(
    opportunity: BasisOpportunity,
    capital: number
  ): ArbPosition | null {
    if (capital < this.config.minCapital || capital > this.config.maxCapital) {
      return null;
    }

    const spotQuantity = capital / opportunity.spotPrice;
    const futuresQuantity = spotQuantity; // 1:1 hedge

    const position: ArbPosition = {
      id: `arb-${Date.now()}`,
      opportunity,
      spotQuantity,
      futuresQuantity,
      spotEntryPrice: opportunity.spotPrice,
      futuresEntryPrice: opportunity.futuresPrice,
      entryBasis: opportunity.basisPercent,
      currentBasis: opportunity.basisPercent,
      unrealizedPnl: 0,
      fundingCaptured: 0,
      openedAt: Date.now(),
      targetExitDate: Date.now() + this.config.maxExpiryDays * 24 * 60 * 60 * 1000,
      status: 'ACTIVE',
    };

    this.positions.set(position.id, position);
    return position;
  }

  /**
   * Update position with current prices
   */
  updatePosition(
    positionId: string,
    currentSpotPrice: number,
    currentFuturesPrice: number,
    fundingCaptured: number = 0
  ): ArbPosition | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const currentBasis = ((currentFuturesPrice - currentSpotPrice) / currentSpotPrice) * 100;
    position.currentBasis = currentBasis;
    position.fundingCaptured += fundingCaptured;

    // Calculate unrealized PnL
    // Cash-and-carry: Long spot + Short futures
    const spotPnl = (currentSpotPrice - position.spotEntryPrice) * position.spotQuantity;
    const futuresPnl = (position.futuresEntryPrice - currentFuturesPrice) * position.futuresQuantity;
    position.unrealizedPnl = spotPnl + futuresPnl + position.fundingCaptured;

    // Check exit conditions
    if (currentBasis < 0.1 || // Basis mostly closed
        Date.now() > position.targetExitDate) {
      position.status = 'EXITING';
    }

    // Check stop loss
    if (Math.abs(currentBasis - position.entryBasis) > this.config.stopLossPercent) {
      position.status = 'EXITING';
    }

    return position;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(basisPercent: number, fundingRate: number): number {
    let confidence = 0.5;

    // Higher basis = higher confidence (more room to close)
    confidence += Math.min(0.3, Math.abs(basisPercent) / 10);

    // Favorable funding adds confidence
    if ((basisPercent > 0 && fundingRate > 0) || (basisPercent < 0 && fundingRate < 0)) {
      confidence += 0.2;
    }

    return Math.min(1, confidence);
  }

  /**
   * Derive futures symbol from spot symbol
   */
  private deriveFuturesSymbol(spotSymbol: string): string {
    // Common patterns: BTCUSDT -> BTCUSDT (perp) or BTCUSDT_240329 (dated)
    if (spotSymbol.endsWith('USDT')) {
      return spotSymbol; // Perpetual
    }
    return `${spotSymbol}_PERP`;
  }

  getOpportunities(): Map<string, BasisOpportunity> { return new Map(this.opportunities); }
  getPositions(): Map<string, ArbPosition> { return new Map(this.positions); }
  getConfig(): OrionConfig { return { ...this.config }; }
}

export default { OrionBot, DEFAULT_ORION_CONFIG };
