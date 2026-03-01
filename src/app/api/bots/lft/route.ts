import { NextRequest, NextResponse } from "next/server";
import { LFTEngine, DEFAULT_LFT_CONFIG, type LFTConfig, type LFTStrategy, type LFTTimeframe, type MacroIndicators } from "@/lib/lft-bot/engine";

let lftEngine: LFTEngine | null = null;

function getLFTEngine(config?: Partial<LFTConfig>) {
  if (!lftEngine || config) {
    lftEngine = new LFTEngine(config || DEFAULT_LFT_CONFIG);
  }
  return lftEngine;
}

export async function GET(request: NextRequest) {
  try {
    const engine = getLFTEngine();
    const state = engine.getState();
    const config = engine.getConfig();

    return NextResponse.json({
      success: true,
      config,
      state: {
        positions: state.positions,
        signals: state.signals,
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
    const { action, config, symbol, timeframe, strategy, price, ohlcv, signal, positionId, macroContext, addSize } = body;

    const engine = getLFTEngine(config);

    switch (action) {
      case "update":
        if (!symbol || !timeframe || !ohlcv) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing symbol, timeframe or ohlcv data" 
          }, { status: 400 });
        }

        engine.update(symbol, timeframe as LFTTimeframe, ohlcv);
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
          strategy as LFTStrategy,
          price,
          macroContext as MacroIndicators | undefined
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

        const position = engine.executeSignal(signal, body.initialSize);

        return NextResponse.json({
          success: true,
          position,
          state: engine.getState(),
        });

      case "addToPosition":
        if (!positionId || price === undefined || addSize === undefined) {
          return NextResponse.json({ 
            success: false, 
            error: "Missing positionId, price or addSize" 
          }, { status: 400 });
        }

        const success = engine.addToPosition(positionId, price, addSize);

        return NextResponse.json({
          success,
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
        // Run LFT simulation with trend following and swing trading
        const simResults: any[] = [];
        const basePrice = 95000;
        const strategies: LFTStrategy[] = ['TREND_FOLLOWING', 'SWING_TRADING', 'BREAKOUT', 'MACRO_MOMENTUM'];

        // Feed multi-timeframe data
        const timeframes: LFTTimeframe[] = ['4h', '1d'];
        
        // Build up trend history
        for (let i = 0; i < 200; i++) {
          const trend = i < 100 ? 1 : -1;  // Trend reversal at 100
          const momentum = Math.sin(i / 20) * 50;
          
          for (const tf of timeframes) {
            const p = basePrice + trend * i * 0.5 + momentum + (Math.random() - 0.5) * 50;
            const h = p + Math.random() * 30;
            const l = p - Math.random() * 30;
            const v = 5000 + Math.random() * 3000;

            engine.update('BTCUSDT', tf, { open: p, high: h, low: l, close: p, volume: v });
          }
        }

        // Generate signals
        for (let i = 0; i < 30; i++) {
          const p = basePrice + (Math.random() - 0.5) * 800;
          const strat = strategies[i % strategies.length];
          
          // Update with new data
          engine.update('BTCUSDT', '1d', {
            open: p,
            high: p + 20,
            low: p - 20,
            close: p,
            volume: 8000 + Math.random() * 4000,
          });

          const macro: MacroIndicators = {
            btcDominance: 52 + (Math.random() - 0.5) * 5,
            totalMarketCap: 2500000000000 + (Math.random() - 0.5) * 100000000000,
            fearGreedIndex: 50 + (Math.random() - 0.5) * 30,
            fundingRateAvg: (Math.random() - 0.5) * 0.002,
            openInterestChange: (Math.random() - 0.5) * 5,
            stablecoinInflow: Math.random() * 1000000000,
            exchangeOutflow: Math.random() * 500000000,
            whaleAccumulation: Math.random() * 0.5,
          };

          const sig = engine.generateSignal('BTCUSDT', strat, p, macro);

          if (sig) {
            simResults.push({
              signal: sig,
              priceIndex: i,
            });

            // Execute some signals
            if (Math.random() > 0.6) {
              const pos = engine.executeSignal(sig);
              if (pos && Math.random() > 0.7) {
                // Simulate pyramiding
                engine.addToPosition(pos.id, p * 1.02, sig.positionSize * 0.3);
              }
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
