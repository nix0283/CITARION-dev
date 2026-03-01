import { NextRequest, NextResponse } from "next/server";
import { ArchitectBot, DEFAULT_ARCHITECT_CONFIG, type ArchitectConfig } from "@/lib/bots/architect/engine";

let architectBot: ArchitectBot | null = null;

function getArchitectBot(config?: Partial<ArchitectConfig>) {
  if (!architectBot || config) {
    architectBot = new ArchitectBot(config || { ...DEFAULT_ARCHITECT_CONFIG, symbol: "BTCUSDT" });
  }
  return architectBot;
}

export async function GET(request: NextRequest) {
  try {
    const bot = getArchitectBot();
    const state = bot.getState();
    
    return NextResponse.json({
      success: true,
      config: bot.getConfig(),
      state: {
        mode: state.mode,
        volatilityRegime: state.volatilityRegime,
        inventory: state.inventory,
        quotes: state.quotes,
        metrics: state.metrics,
        toxicityScore: state.toxicityScore,
        circuitBreakerActive: state.circuitBreakerActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, marketState, fill } = body;

    const bot = getArchitectBot(config);

    switch (action) {
      case "start":
        bot.reset();
        return NextResponse.json({
          success: true,
          message: "Market Maker started",
        });

      case "generate_quotes":
        if (!marketState) {
          // Mock market state
          const mockMarket = {
            symbol: "BTCUSDT",
            bid: 94900,
            ask: 95100,
            mid: 95000,
            spread: 200,
            volatility: 0.4,
            volume24h: 15000000000,
            orderbookImbalance: 0.1,
            tradeFlow: 0.05,
            lastUpdate: Date.now(),
          };
          
          const quotes = bot.generateQuotes(mockMarket);
          return NextResponse.json({
            success: true,
            quotes,
            state: bot.getState(),
          });
        }
        
        const quotes = bot.generateQuotes(marketState);
        return NextResponse.json({
          success: true,
          quotes,
          state: bot.getState(),
        });

      case "process_fill":
        if (!fill) {
          return NextResponse.json({ success: false, error: "Missing fill data" }, { status: 400 });
        }
        
        bot.processFill(fill.side, fill.price, fill.quantity);
        
        return NextResponse.json({
          success: true,
          inventory: bot.getState().inventory,
        });

      case "update_market":
        if (!marketState) {
          return NextResponse.json({ success: false, error: "Missing market state" }, { status: 400 });
        }
        
        bot.updateMarket(marketState);
        
        return NextResponse.json({
          success: true,
          state: bot.getState(),
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
