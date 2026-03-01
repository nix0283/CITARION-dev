import { NextRequest, NextResponse } from "next/server";
import { SpectrumBot, DEFAULT_SPECTRUM_CONFIG, type SpectrumConfig } from "@/lib/bots/spectrum/engine";

let spectrumBot: SpectrumBot | null = null;

function getSpectrumBot(config?: Partial<SpectrumConfig>) {
  if (!spectrumBot || config) {
    spectrumBot = new SpectrumBot(config || DEFAULT_SPECTRUM_CONFIG);
  }
  return spectrumBot;
}

export async function GET(request: NextRequest) {
  try {
    const bot = getSpectrumBot();
    
    return NextResponse.json({
      success: true,
      config: bot.getConfig(),
      pairs: Array.from(bot.getPairs().entries()).map(([k, v]) => v),
      positions: Array.from(bot.getPositions().entries()).map(([k, v]) => v),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, asset1, asset2, prices1, prices2 } = body;

    const bot = getSpectrumBot(config);

    switch (action) {
      case "scan":
        // Mock scan - find correlated pairs
        const pairs = [];
        
        // BTC/ETH correlation
        const btcPrices = Array.from({ length: 100 }, (_, i) => 90000 + Math.sin(i * 0.1) * 5000 + Math.random() * 1000);
        const ethPrices = Array.from({ length: 100 }, (_, i) => 3200 + Math.sin(i * 0.1) * 200 + Math.random() * 50);
        
        const pair = bot.analyzePair("BTCUSDT", "ETHUSDT", btcPrices, ethPrices);
        if (pair) pairs.push(pair);

        // SOL/AVAX correlation
        const solPrices = Array.from({ length: 100 }, (_, i) => 150 + Math.sin(i * 0.1) * 20 + Math.random() * 5);
        const avaxPrices = Array.from({ length: 100 }, (_, i) => 35 + Math.sin(i * 0.1) * 5 + Math.random() * 2);
        
        const pair2 = bot.analyzePair("SOLUSDT", "AVAXUSDT", solPrices, avaxPrices);
        if (pair2) pairs.push(pair2);
        
        return NextResponse.json({
          success: true,
          pairs,
        });

      case "analyze":
        if (!asset1 || !asset2 || !prices1 || !prices2) {
          return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }
        
        const result = bot.analyzePair(asset1, asset2, prices1, prices2);
        
        return NextResponse.json({
          success: true,
          pair: result,
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
