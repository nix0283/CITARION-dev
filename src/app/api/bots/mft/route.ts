import { NextRequest, NextResponse } from "next/server";
import { MFTEngine, DEFAULT_MFT_CONFIG, type MFTConfig, type MFTStrategy } from "@/lib/mft-bot/engine";

let mftEngine: MFTEngine | null = null;

function getMFTEngine(config?: Partial<MFTConfig>) {
  if (!mftEngine || config) {
    mftEngine = new MFTEngine(config || DEFAULT_MFT_CONFIG);
  }
  return mftEngine;
}

export async function GET(request: NextRequest) {
  try {
    const engine = getMFTEngine();
    const state = engine.getState();
    const config = engine.getConfig();

    return NextResponse.json({
      success: true,
      config,
      state: {
        positions: state.positions,
        signals: state.signals,
        metrics: state.metrics,
        regime: state.regime,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, symbol, strategy, price, high, low, volume, signal, positionId, additionalData } = body;

    const engine = getMFTEngine(config);

    switch (action) {
      case "update":
        if (!symbol || price === undefined) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing symbol or price" 
          }, { status: 400 });
        }

        engine.update(symbol, high || price, low || price, price, volume || 0);
        return NextResponse.json({ success: true });

      case "generateSignal":
        if (!symbol || !strategy || price === undefined) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing symbol, strategy or price" 
          }, { status: 400 });
        }

        const newSignal = engine.generateSignal(
          symbol,
          strategy as MFTStrategy,
          price,
          additionalData
        );

        return NextResponse.json({
          success: true,
          signal: newSignal,
          state: engine.getState(),
        });

      case "executeSignal":
        if (!signal) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing signal" 
          }, { status: 400 });
        }

        const position = engine.executeSignal(signal);

        return NextResponse.json({
          success: true,
          position,
          state: engine.getState(),
        });

      case "closePosition":
        if (!positionId || price === undefined) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing positionId or price" 
          }, { status: 400 });
        }

        const closedPosition = engine.closePosition(positionId, price);

        return NextResponse.json({
          success: true,
          position: closedPosition,
          state: engine.getState(),
        });

      case "getConfig":
        return NextResponse.json({
          success: true,
          config: engine.getConfig(),
        });

      case "updateConfig":
        const newConfig = body.newConfig;
        if (!newConfig) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing newConfig" 
          }, { status: 400 });
        }

        engine.updateConfig(newConfig);
        return NextResponse.json({
          success: true,
          config: engine.getConfig(),
        });

      case "simulate":
        // Run MFT simulation with multiple strategies
        const simResults: any[] = [];
        const basePrice = 95000;
        const strategies: MFTStrategy[] = ['MOMENTUM', 'MEAN_REVERSION', 'VWAP_REVERSION', 'VOLUME_BREAKOUT'];

        // Feed some price history first
        for (let i = 0; i < 100; i++) {
          const trend = i < 50 ? 1 : -1;
          const p = basePrice + trend * i * 2 + (Math.random() - 0.5) * 100;
          const h = p + Math.random() * 20;
          const l = p - Math.random() * 20;
          const v = 1000 + Math.random() * 500;
          engine.update('BTCUSDT', h, l, p, v);
        }

        // Generate signals
        for (let i = 0; i < 50; i++) {
          const p = basePrice + (Math.random() - 0.5) * 500;
          const strat = strategies[i % strategies.length];
          
          engine.update('BTCUSDT', p + 10, p - 10, p, 1500 + Math.random() * 1000);
          
          const sig = engine.generateSignal('BTCUSDT', strat, p, {
            volume: 1500 + Math.random() * 1000,
            orderbookImbalance: (Math.random() - 0.5) * 0.3,
          });

          if (sig) {
            simResults.push({
              signal: sig,
              priceIndex: i,
            });

            // Execute some signals
            if (Math.random() > 0.5) {
              engine.executeSignal(sig);
            }
          }
        }

        return NextResponse.json({
          success: true,
          results: simResults,
          state: engine.getState(),
        });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
