import { NextRequest, NextResponse } from "next/server";
import { OrionBot, DEFAULT_ORION_CONFIG, type OrionConfig, type BasisOpportunity } from "@/lib/bots/orion/engine";

let orionBot: OrionBot | null = null;

function getOrionBot(config?: Partial<OrionConfig>) {
  if (!orionBot || config) {
    orionBot = new OrionBot(config || DEFAULT_ORION_CONFIG);
  }
  return orionBot;
}

export async function GET(request: NextRequest) {
  try {
    const bot = getOrionBot();
    
    return NextResponse.json({
      success: true,
      config: bot.getConfig(),
      opportunities: Array.from(bot.getOpportunities().entries()).map(([k, v]) => v),
      positions: Array.from(bot.getPositions().entries()).map(([k, v]) => v),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, opportunity, capital } = body;

    const bot = getOrionBot(config);

    switch (action) {
      case "scan":
        // Mock scan - in production would fetch real prices from exchanges
        const mockSpotPrices = new Map([
          ["BTCUSDT", 95000],
          ["ETHUSDT", 3500],
          ["SOLUSDT", 180],
        ]);
        const mockFuturesPrices = new Map([
          ["BTCUSDT", 95300],
          ["ETHUSDT", 3535],
          ["SOLUSDT", 182],
        ]);
        const mockFundingRates = new Map([
          ["BTCUSDT", 0.0001],
          ["ETHUSDT", 0.00015],
          ["SOLUSDT", 0.0002],
        ]);

        const opportunities = bot.scan(mockSpotPrices, mockFuturesPrices, mockFundingRates);
        
        return NextResponse.json({
          success: true,
          opportunities,
        });

      case "execute":
        if (!opportunity || !capital) {
          return NextResponse.json({ success: false, error: "Missing opportunity or capital" }, { status: 400 });
        }
        
        const position = bot.executeCashAndCarry(opportunity as BasisOpportunity, capital);
        
        return NextResponse.json({
          success: true,
          position,
        });

      case "update":
        // Update config
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
