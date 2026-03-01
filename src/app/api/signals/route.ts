import { NextRequest, NextResponse } from 'next/server'
import { createSignalBot } from '@/lib/signal-bot/cornix-bot'

// Singleton signal bot instance
let signalBotInstance: ReturnType<typeof createSignalBot> | null = null

function getSignalBot() {
  if (!signalBotInstance) {
    signalBotInstance = createSignalBot({
      minConfidence: 0.6,
      maxPositionSize: 500,
      maxLeverage: 10,
      defaultLeverage: 3,
      maxRiskPerTrade: 2
    })
  }
  return signalBotInstance
}

// GET /api/signals - List all signals
export async function GET(request: NextRequest) {
  try {
    const bot = getSignalBot()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status') as 'pending' | 'active' | 'closed' | null
    const signals = bot.getSignals(status || undefined)
    
    // Get account summary
    const summary = bot.getAccountSummary()
    
    // Get open positions
    const positions = bot.getSignals('active')
    
    return NextResponse.json({
      success: true,
      summary,
      signals: signals.slice(0, 50).map(s => ({
        id: s.id,
        source: s.source,
        symbol: s.symbol,
        direction: s.direction,
        entryPrice: s.entryPrice,
        status: s.status,
        confidence: s.confidence,
        takeProfits: s.takeProfits,
        stopLoss: s.stopLoss,
        leverage: s.leverage,
        validation: s.validation,
        execution: s.execution ? {
          entryPrice: s.execution.entryPrice,
          positionSize: s.execution.positionSize,
          leverage: s.execution.leverage,
          currentPrice: s.execution.currentPrice,
          unrealizedPnl: s.execution.unrealizedPnl,
          unrealizedPnlPercent: s.execution.unrealizedPnlPercent,
          takeProfitsHit: s.execution.takeProfitsHit,
          stopLossHit: s.execution.stopLossHit
        } : null,
        timestamp: s.timestamp
      })),
      positions: positions.map(p => ({
        id: p.id,
        signalId: p.signalId,
        symbol: p.symbol,
        direction: p.direction,
        entryPrice: p.entryPrice,
        positionSize: p.positionSize,
        leverage: p.leverage,
        currentPrice: p.currentPrice,
        unrealizedPnl: p.unrealizedPnl,
        unrealizedPnlPercent: p.unrealizedPnlPercent,
        stopLoss: p.stopLoss,
        takeProfits: p.takeProfits,
        status: p.status
      }))
    })
  } catch (error) {
    console.error('Failed to get signals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get signals' },
      { status: 500 }
    )
  }
}

// POST /api/signals - Process new signal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bot = getSignalBot()
    
    // Process signal from message
    if (body.message) {
      const signal = await bot.processSignal(
        body.message,
        body.source || 'webhook'
      )
      
      return NextResponse.json({
        success: true,
        signal: {
          id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          status: signal.status,
          confidence: signal.confidence,
          validation: signal.validation,
          execution: signal.execution
        }
      })
    }
    
    // Process TradingView webhook
    if (body.action && body.symbol) {
      const tvMessage = JSON.stringify({
        symbol: body.symbol,
        action: body.action,
        price: body.price,
        stop_loss: body.stop_loss,
        take_profit: body.take_profit,
        leverage: body.leverage
      })
      
      const signal = await bot.processSignal(tvMessage, 'tradingview')
      
      return NextResponse.json({
        success: true,
        signal: {
          id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          status: signal.status
        }
      })
    }
    
    // Process structured signal
    if (body.symbol && body.direction) {
      const signal = await bot.processSignal(
        JSON.stringify(body),
        body.source || 'api'
      )
      
      return NextResponse.json({
        success: true,
        signal: {
          id: signal.id,
          symbol: signal.symbol,
          direction: signal.direction,
          status: signal.status
        }
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid signal format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to process signal:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/signals - Update signal or close position
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const bot = getSignalBot()
    
    if (body.action === 'close' && body.signalId) {
      await bot.closeSignal(body.signalId, body.reason || 'manual')
      
      return NextResponse.json({
        success: true,
        message: 'Position closed'
      })
    }
    
    if (body.action === 'update_prices' && body.prices) {
      await bot.updatePositions(body.prices)
      
      return NextResponse.json({
        success: true,
        message: 'Positions updated'
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to update signal:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/signals - Delete signal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const signalId = searchParams.get('id')
    
    if (!signalId) {
      return NextResponse.json(
        { success: false, error: 'Signal ID required' },
        { status: 400 }
      )
    }
    
    const bot = getSignalBot()
    
    // Close position if active
    const signal = bot.getSignal(signalId)
    if (signal?.status === 'active') {
      await bot.closeSignal(signalId, 'deleted')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Signal deleted'
    })
  } catch (error) {
    console.error('Failed to delete signal:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
