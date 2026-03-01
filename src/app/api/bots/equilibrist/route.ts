import { NextRequest, NextResponse } from "next/server";
import { EquilibristBot, DEFAULT_EQUILIBRIST_CONFIG, type EquilibristConfig } from "@/lib/bots/equilibrist/engine";

let equilibristBot: EquilibristBot | null = null;

function getEquilibristBot(config?: Partial<EquilibristConfig>) {
  if (!equilibristBot || config) {
    equilibristBot = new EquilibristBot(config || DEFAULT_EQUILIBRIST_CONFIG);
  }
  return equilibristBot;
}

export async function GET(request: NextRequest) {
  try {
    const bot = getEquilibristBot();
    const states = bot.getStates();
    
    return NextResponse.json({
      success: true,
      config: bot.getConfig(),
      symbols: Array.from(states.keys()),
      states: Array.from(states.entries()).map(([symbol, state]) => ({ symbol, ...state })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, symbol, prices } = body;

    const bot = getEquilibristBot(config);

    switch (action) {
      case "analyze":
        if (!symbol || !prices) {
          return NextResponse.json({ success: false, error: "Missing symbol or prices" }, { status: 400 });
        }
        
        const state = bot.analyze(symbol, prices);
        
        return NextResponse.json({
          success: true,
          state,
        });

      case "scan":
        // Mock scan for mean-reverting assets
        const results = [];
        const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];
        
        for (const sym of symbols) {
          // Generate mock price data with mean-reverting behavior
          const mockPrices: number[] = [];
          let price = 100;
          for (let i = 0; i < 100; i++) {
            price = price * 0.95 + 100 * 0.05 + (Math.random() - 0.5) * 5;
            mockPrices.push(price);
          }
          
          const result = bot.analyze(sym, mockPrices);
          if (result && result.signal !== "NEUTRAL") {
            results.push(result);
          }
        }
        
        return NextResponse.json({
          success: true,
          signals: results,
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
