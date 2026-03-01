# CITARION Orchestration Layer Architecture

## Overview

The Orchestration Layer is the central nervous system of the CITARION trading platform, providing event-driven communication between all bots and services. This document describes the architecture, components, and usage patterns.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CITARION Platform                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Operational │  │Institutional│  │  Frequency  │                │
│  │    Bots     │  │    Bots     │  │    Bots     │                │
│  │             │  │             │  │             │                │
│  │ GRD, DCA,   │  │ ARB, PAR,   │  │ HFT, MFT,   │                │
│  │ BBB, RNG,   │  │ STA, MMK,   │  │ LFT         │                │
│  │ PND, FCS    │  │ MRB, TRF    │  │             │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          │                                         │
│                          ▼                                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      EVENT BUS                                │ │
│  │                                                               │ │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│  │   │   Trading   │  │    Risk     │  │   Market    │          │ │
│  │   │   Events    │  │   Events    │  │   Events    │          │ │
│  │   └─────────────┘  └─────────────┘  └─────────────┘          │ │
│  │                                                               │ │
│  │   Backend: In-Memory (dev) | NATS JetStream (prod)           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                          │                                         │
│                          ▼                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Integration │  │  Analytics  │  │     UI      │                │
│  │    Bots     │  │    Bots     │  │  Dashboard  │                │
│  │             │  │             │  │             │                │
│  │ ORA, LUM,   │  │ LOG (LOGOS) │  │  Real-time  │                │
│  │ WLF         │  │             │  │   Updates   │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Bot Classification

### Operational Bots (6)
| Code | Name | Description |
|------|------|-------------|
| GRD | MESH | Grid Trading |
| DCA | SCALE | Dollar Cost Averaging |
| BBB | BAND | Bollinger Bands |
| RNG | EDGE | Range Trading |
| PND | Argus | Pump & Dump Detection |
| FCS | Vision | Forecasting |

### Institutional Bots (6)
| Code | Name | Description |
|------|------|-------------|
| ARB | Orion | Cross-Exchange Arbitrage |
| PAR | Spectrum | Pairs Trading |
| STA | Reed | Statistical Trading |
| MMK | Architect | Market Making |
| MRB | Equilibrist | Mean Reversion Basket |
| TRF | Kron | Transfer/Rebalancing |

### Frequency Bots (3)
| Code | Name | Holding Period |
|------|------|----------------|
| HFT | Helios | seconds-minutes |
| MFT | Selene | 15min-4hours |
| LFT | Atlas | days-weeks |

### Integration & Analytics (4)
| Code | Name | Description |
|------|------|-------------|
| ORA | Oracle | Chat Bot / AI Assistant |
| LUM | Lumi | Data Integration |
| WLF | Wolf | Alert System |
| LOG | LOGOS | Meta-Analyst & Autonomous Trader |

## Event Bus

### Topic Structure

Topics follow the pattern: `<domain>.<entity>.<action>`

```
Examples:
- trading.signal.generated
- trading.order.filled
- trading.position.updated
- market.orderbook.update
- risk.alert.triggered
- system.bot.started
```

### Wildcards

- `*` - matches single level: `trading.*.signal.*`
- `>` - matches multiple levels: `trading.>`

### Event Structure

```typescript
interface BaseEvent<T> {
  id: string;                    // Unique event ID
  topic: string;                 // Full topic path
  domain: EventDomain;           // trading, market, risk, etc.
  entity: EventEntity;           // signal, order, position, etc.
  action: EventAction;           // created, updated, filled, etc.
  timestamp: number;             // Unix timestamp (ms)
  source: BotCode;               // Bot that emitted the event
  priority: EventPriority;       // critical, high, normal, low
  correlationId?: string;        // For request-response
  causationId?: string;          // For event chains
  metadata?: Record<string, unknown>;
  payload: T;                    // Event-specific data
}
```

## Usage Examples

### Initialize Event Bus

```typescript
import { EventBusManager } from '@/lib/orchestration';

// Development (in-memory)
await EventBusManager.initialize({ type: 'memory' });

// Production (NATS JetStream)
await EventBusManager.initialize({
  type: 'nats',
  nats: {
    servers: ['nats://localhost:4222'],
    stream: 'citarion-events',
  },
});
```

### Subscribe to Events

```typescript
import { eventBus, subscribeToSignals } from '@/lib/orchestration';

// Subscribe to all trading signals
await subscribeToSignals((event) => {
  console.log('Signal:', event.payload);
});

// Subscribe to specific pattern
await eventBus.subscribe('trading.order.*', (event) => {
  console.log('Order event:', event);
});
```

### Publish Events

```typescript
import { publishSignal, publishOrder } from '@/lib/orchestration';

// Publish a signal
await publishSignal('GRD', {
  symbol: 'BTCUSDT',
  exchange: 'binance',
  direction: 'LONG',
  confidence: 0.85,
  entryPrice: 50000,
  stopLoss: 48000,
  takeProfit: 55000,
});

// Publish an order
await publishOrder('GRD', {
  orderId: '12345',
  symbol: 'BTCUSDT',
  exchange: 'binance',
  side: 'BUY',
  type: 'LIMIT',
  price: 50000,
  quantity: 0.01,
  status: 'FILLED',
}, 'filled');
```

## Backend Options

### In-Memory (Development)
- Zero configuration
- No persistence
- Single process only
- Use for: development, testing

### NATS JetStream (Production)
- Persistent message storage
- Message replay capability
- Durable subscriptions
- Clustering support
- Use for: production, multi-instance

## Performance Targets

| Metric | Target |
|--------|--------|
| Event Latency (Memory) | < 1ms |
| Event Latency (NATS) | < 100μs |
| Throughput | > 100,000 events/sec |
| Availability | 99.99% |

## File Structure

```
src/lib/orchestration/
├── index.ts           # Main entry point
├── types.ts           # TypeScript types
├── event-bus.ts       # Event bus implementations
├── bot-registry.ts    # Bot metadata registry
└── README.md          # This documentation
```

## Next Steps

1. Integrate each bot to emit events
2. Update UI to subscribe to event bus
3. Implement LOGOS signal aggregation
4. Add NATS deployment configuration
5. Implement event persistence
