import { NextRequest, NextResponse } from "next/server";
import { ReedBot, CointegrationTests, DEFAULT_REED_CONFIG, type ReedConfig } from "@/lib/bots/reed/engine";

let reedBot: ReedBot | null = null;

function getReedBot(config?: Partial<ReedConfig>) {
  if (!reedBot || config) {
    reedBot = new ReedBot(config || DEFAULT_REED_CONFIG);
  }
  return reedBot;
}

export async function GET(request: NextRequest) {
  try {
    const bot = getReedBot();
    const state = bot.getState();
    
    return NextResponse.json({
      success: true,
      config: bot.getConfig(),
      state: {
        pairsCount: state.pairs.size,
        positionsCount: state.activePositions.size,
        metrics: state.metrics,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, asset1, asset2, prices1, prices2, pairId, currentPrices } = body;

    const bot = getReedBot(config);

    switch (action) {
      case "scan":
        // Mock cointegration analysis
        const cointegratedPairs = [];
        
        // Generate mock price data
        const generatePrices = (base: number, trend: number, noise: number, n: number = 252) => {
          return Array.from({ length: n }, (_, i) => 
            base * (1 + trend * i / n) + (Math.random() - 0.5) * noise
          );
        };

        // BTC/ETH test
        const btcPrices = generatePrices(95000, 0.1, 3000);
        const ethPrices = generatePrices(3500, 0.1, 150);
        const pair1 = bot.analyzePair("BTCUSDT", "ETHUSDT", btcPrices, ethPrices);
        if (pair1) cointegratedPairs.push(pair1);

        // SOL/AVAX test  
        const solPrices = generatePrices(150, 0.15, 10);
        const avaxPrices = generatePrices(35, 0.12, 2);
        const pair2 = bot.analyzePair("SOLUSDT", "AVAXUSDT", solPrices, avaxPrices);
        if (pair2) cointegratedPairs.push(pair2);
        
        return NextResponse.json({
          success: true,
          pairs: cointegratedPairs,
        });

      case "analyze":
        if (!asset1 || !asset2 || !prices1 || !prices2) {
          return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }
        
        const pair = bot.analyzePair(asset1, asset2, prices1, prices2);
        
        // Run ADF test
        const spread = prices1.map((p1: number, i: number) => p1 - (pair?.hedgeRatio || 1) * prices2[i]);
        const adfResult = CointegrationTests.adfTest(spread);
        
        return NextResponse.json({
          success: true,
          pair,
          adfResult,
        });

      case "signal":
        if (!pairId || !currentPrices) {
          return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }
        
        const signal = bot.generateSignals(pairId, currentPrices.price1, currentPrices.price2);
        
        return NextResponse.json({
          success: true,
          signal,
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
