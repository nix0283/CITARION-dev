import { NextRequest, NextResponse } from "next/server";
import { KronBot, DEFAULT_KRON_CONFIG, type KronConfig } from "@/lib/bots/kron/engine";

let kronBot: KronBot | null = null;

function getKronBot(config?: Partial<KronConfig>) {
  if (!kronBot || config) {
    kronBot = new KronBot(config || DEFAULT_KRON_CONFIG);
  }
  return kronBot;
}

export async function GET(request: NextRequest) {
  try {
    const bot = getKronBot();
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
    const { action, config, symbol, candles } = body;

    const bot = getKronBot(config);

    switch (action) {
      case "analyze":
        if (!symbol || !candles) {
          return NextResponse.json({ success: false, error: "Missing symbol or candles" }, { status: 400 });
        }
        
        const state = bot.analyze(symbol, candles);
        
        return NextResponse.json({
          success: true,
          state,
        });

      case "scan":
        // Mock trend scan across multiple symbols
        const results = [];
        const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"];
        
        for (const sym of symbols) {
          // Generate mock candle data
          const mockCandles = [];
          let close = sym === "BTCUSDT" ? 95000 : sym === "ETHUSDT" ? 3500 : 150;
          const trend = Math.random() > 0.5 ? 1 : -1; // Random trend direction
          
          for (let i = 0; i < 300; i++) {
            const open = close;
            close = close * (1 + trend * 0.0005 + (Math.random() - 0.5) * 0.01);
            const high = Math.max(open, close) * (1 + Math.random() * 0.005);
            const low = Math.min(open, close) * (1 - Math.random() * 0.005);
            const volume = 1000 + Math.random() * 5000;
            
            mockCandles.push({ high, low, close, volume });
          }
          
          const result = bot.analyze(sym, mockCandles);
          if (result && result.signal !== "HOLD") {
            results.push(result);
          }
        }
        
        return NextResponse.json({
          success: true,
          signals: results,
        });

      case "update":
        return NextResponse.json({
          success: true,
          config: bot.getConfig(),
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
