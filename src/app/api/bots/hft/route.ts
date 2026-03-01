import { NextRequest, NextResponse } from "next/server";
import { HFTEngine, DEFAULT_HFT_CONFIG, type HFTConfig, type OrderbookSnapshot, type MarketRegime } from "@/lib/hft-bot/engine";

let hftEngine: HFTEngine | null = null;

function getHFTEngine(config?: Partial<HFTConfig>) {
  if (!hftEngine || config) {
    hftEngine = new HFTEngine(config || DEFAULT_HFT_CONFIG);
  }
  return hftEngine;
}

export async function GET(request: NextRequest) {
  try {
    const engine = getHFTEngine();
    const state = engine.getState();
    const config = engine.getConfig();

    return NextResponse.json({
      success: true,
      config,
      state: {
        isRunning: state.isRunning,
        activeSignals: state.activeSignals,
        dailyTrades: state.dailyTrades,
        dailyPnL: state.dailyPnL,
        currentDrawdown: state.currentDrawdown,
        circuitBreakerActive: state.circuitBreakerActive,
        circuitBreakerReason: state.circuitBreakerReason,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, signal, orderbook, trades, equity, regime } = body;

    const engine = getHFTEngine(config);

    switch (action) {
      case "start":
        engine.start();
        return NextResponse.json({
          success: true,
          message: "HFT Engine started",
          state: engine.getState(),
        });

      case "stop":
        engine.stop();
        return NextResponse.json({
          success: true,
          message: "HFT Engine stopped",
          state: engine.getState(),
        });

      case "reset":
        engine.reset();
        return NextResponse.json({
          success: true,
          message: "HFT Engine reset",
          state: engine.getState(),
        });

      case "resetDaily":
        engine.resetDaily();
        return NextResponse.json({
          success: true,
          message: "HFT Engine daily reset",
          state: engine.getState(),
        });

      case "processSignal":
        if (!signal || !regime) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing signal or regime data" 
          }, { status: 400 });
        }

        const processedSignal = engine.processSignal(
          signal,
          regime as MarketRegime
        );

        return NextResponse.json({
          success: true,
          signal: processedSignal,
          canOpen: engine.canOpenPosition(),
        });

      case "updateOrderbook":
        if (!orderbook) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing orderbook data" 
          }, { status: 400 });
        }

        engine.updateOrderbook(orderbook.symbol, orderbook as OrderbookSnapshot);
        return NextResponse.json({ success: true });

      case "updateTrades":
        if (!trades) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing trades data" 
          }, { status: 400 });
        }

        engine.updateTrades(trades.symbol, trades.trades);
        return NextResponse.json({ success: true });

      case "updateEquity":
        if (equity === undefined) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing equity value" 
          }, { status: 400 });
        }

        engine.updateEquity(equity);
        return NextResponse.json({ 
          success: true,
          state: engine.getState(),
        });

      case "recordTrade":
        const pnl = body.pnl;
        if (pnl === undefined) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing pnl value" 
          }, { status: 400 });
        }

        engine.recordTrade(pnl);
        return NextResponse.json({ 
          success: true,
          state: engine.getState(),
        });

      case "getConfig":
        return NextResponse.json({
          success: true,
          config: engine.getConfig(),
        });

      case "simulate":
        // Run HFT simulation
        const simSignals = [];
        const basePrice = 95000;
        
        for (let i = 0; i < 100; i++) {
          const price = basePrice + (Math.random() - 0.5) * 200;
          const mockOrderbook: OrderbookSnapshot = {
            symbol: 'BTCUSDT',
            timestamp: Date.now() + i * 100,
            bids: Array.from({ length: 20 }, (_, j) => ({
              price: price - (j + 1) * 0.5,
              quantity: Math.random() * 10,
              cumulative: 0,
              delta: Math.random() * 5,
            })),
            asks: Array.from({ length: 20 }, (_, j) => ({
              price: price + (j + 1) * 0.5,
              quantity: Math.random() * 10,
              cumulative: 0,
              delta: Math.random() * 5,
            })),
            spread: 1,
            midPrice: price,
            imbalance: (Math.random() - 0.5) * 0.3,
            depth: 100000,
          };

          engine.updateOrderbook('BTCUSDT', mockOrderbook);

          const rawSignal = {
            symbol: 'BTCUSDT',
            direction: Math.random() > 0.5 ? 'LONG' as const : 'SHORT' as const,
            strength: Math.random() > 0.7 ? 'STRONG' as const : 'MODERATE' as const,
            entry: price,
            stop: price * (Math.random() > 0.5 ? 0.998 : 1.002),
            target: price * (Math.random() > 0.5 ? 1.003 : 0.997),
          };

          const sig = engine.processSignal(rawSignal, 'RANGING');
          if (sig) {
            simSignals.push({ ...sig, priceIndex: i });
          }
        }

        return NextResponse.json({
          success: true,
          signals: simSignals,
          state: engine.getState(),
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
