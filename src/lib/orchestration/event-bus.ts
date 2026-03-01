/**
 * Event Bus Implementation - Core orchestration layer for CITARION
 * 
 * Provides event-driven communication between all bots and services.
 * Supports multiple backends: In-Memory (development), NATS JetStream (production).
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

import {
  BaseEvent,
} from './types';

// ==================== TYPES ====================

/**
 * Event handler function type
 */
export type EventHandler<T = BaseEvent> = (event: T) => void | Promise<void>;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  queue?: string;           // Queue group for load balancing
  durable?: string;         // Durable subscription name
  replay?: 'instant' | 'original';  // Message replay mode
  maxDeliver?: number;      // Max redelivery attempts
  ackWait?: number;         // Ack timeout in ms
}

/**
 * Publish options
 */
export interface PublishOptions {
  retention?: 'limits' | 'interest' | 'workqueue';
  maxAge?: number;          // Max message age in ms
  maxMessages?: number;     // Max messages per subject
  replicate?: number;       // Number of replicas
}

/**
 * Event Bus statistics
 */
export interface EventBusStats {
  totalPublished: number;
  totalReceived: number;
  activeSubscriptions: number;
  topics: Map<string, number>;
  errors: number;
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * Event Bus interface
 */
export interface IEventBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  publish<T>(event: BaseEvent<T>, options?: PublishOptions): Promise<void>;
  subscribe<T>(pattern: string, handler: EventHandler<T>, options?: SubscriptionOptions): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  request<T, R>(topic: string, payload: T, timeout?: number): Promise<R>;
  reply<T, R>(pattern: string, handler: (payload: T) => R | Promise<R>): Promise<string>;
  getStats(): EventBusStats;
  reset(): Promise<void>;
}

// ==================== IN-MEMORY EVENT BUS ====================

/**
 * In-memory Event Bus implementation
 * Used for development and testing. Not suitable for production.
 */
export class MemoryEventBus implements IEventBus {
  private connected = false;
  private subscriptions = new Map<string, { pattern: string; handler: EventHandler; options?: SubscriptionOptions }>();
  private replyHandlers = new Map<string, (payload: unknown) => unknown>();
  private stats: EventBusStats = {
    totalPublished: 0,
    totalReceived: 0,
    activeSubscriptions: 0,
    topics: new Map(),
    errors: 0,
  };
  private eventHistory: BaseEvent[] = [];
  private maxHistorySize = 1000;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[EventBus] Memory Event Bus connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
    this.replyHandlers.clear();
    console.log('[EventBus] Memory Event Bus disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish<T>(event: BaseEvent<T>, _options?: PublishOptions): Promise<void> {
    if (!this.connected) {
      throw new Error('Event bus not connected');
    }

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Update stats
    this.stats.totalPublished++;
    const topicCount = this.stats.topics.get(event.topic) ?? 0;
    this.stats.topics.set(event.topic, topicCount + 1);

    // Deliver to matching subscriptions
    for (const [id, sub] of this.subscriptions) {
      if (this.matchesPattern(event.topic, sub.pattern)) {
        try {
          await sub.handler(event);
          this.stats.totalReceived++;
        } catch (error) {
          this.stats.errors++;
          this.stats.lastError = error instanceof Error ? error.message : String(error);
          this.stats.lastErrorTime = Date.now();
          console.error(`[EventBus] Handler error for ${sub.pattern}:`, error);
        }
      }
    }

    // Handle request-response
    if (event.correlationId && this.replyHandlers.has(event.correlationId)) {
      const handler = this.replyHandlers.get(event.correlationId);
      if (handler) {
        handler(event.payload);
        this.replyHandlers.delete(event.correlationId);
      }
    }
  }

  async subscribe<T>(pattern: string, handler: EventHandler<T>, options?: SubscriptionOptions): Promise<string> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.subscriptions.set(id, { pattern, handler: handler as EventHandler, options });
    this.stats.activeSubscriptions = this.subscriptions.size;
    console.log(`[EventBus] Subscribed to: ${pattern} (id: ${id})`);
    return id;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      this.stats.activeSubscriptions = this.subscriptions.size;
      console.log(`[EventBus] Unsubscribed: ${subscriptionId}`);
    }
  }

  async request<T, R>(_topic: string, payload: T, timeout = 5000): Promise<R> {
    return new Promise((resolve, reject) => {
      const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Set up reply handler
      this.replyHandlers.set(correlationId, (response) => {
        resolve(response as R);
      });

      // Set timeout
      setTimeout(() => {
        if (this.replyHandlers.has(correlationId)) {
          this.replyHandlers.delete(correlationId);
          reject(new Error('Request timeout'));
        }
      }, timeout);

      // Publish request
      const event: BaseEvent<T> = {
        id: `evt_${Date.now()}`,
        topic: _topic,
        domain: 'trading',
        entity: 'signal',
        action: 'created',
        timestamp: Date.now(),
        source: 'LOG',
        priority: 'normal',
        correlationId,
        payload,
      };

      this.publish(event).catch(reject);
    });
  }

  async reply<T, R>(pattern: string, handler: (payload: T) => R | Promise<R>): Promise<string> {
    return this.subscribe(pattern, async (event: BaseEvent<T>) => {
      if (event.correlationId) {
        const response = await handler(event.payload);
        await this.publish({
          id: `evt_${Date.now()}`,
          topic: `${event.topic}.reply`,
          domain: event.domain,
          entity: event.entity,
          action: 'updated',
          timestamp: Date.now(),
          source: event.source,
          priority: event.priority,
          correlationId: event.correlationId,
          payload: response,
        });
      }
    });
  }

  getStats(): EventBusStats {
    return { ...this.stats };
  }

  async reset(): Promise<void> {
    this.subscriptions.clear();
    this.replyHandlers.clear();
    this.eventHistory = [];
    this.stats = {
      totalPublished: 0,
      totalReceived: 0,
      activeSubscriptions: 0,
      topics: new Map(),
      errors: 0,
    };
  }

  /**
   * Check if a topic matches a pattern with wildcards
   */
  private matchesPattern(topic: string, pattern: string): boolean {
    const topicParts = topic.split('.');
    const patternParts = pattern.split('.');

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      
      if (patternPart === '>') {
        return true;
      }
      
      if (patternPart === '*') {
        continue;
      }
      
      if (i >= topicParts.length || patternPart !== topicParts[i]) {
        return false;
      }
    }

    return topicParts.length === patternParts.length;
  }

  /**
   * Get event history (for debugging)
   */
  getHistory(): BaseEvent[] {
    return [...this.eventHistory];
  }
}

// ==================== NATS EVENT BUS ====================

/**
 * NATS JetStream Event Bus implementation
 * Production-grade event bus with persistence and replay.
 */
export class NATSEventBus implements IEventBus {
  private connected = false;
  private nc: unknown = null;
  private js: unknown = null;
  private subscriptions = new Map<string, unknown>();
  private stats: EventBusStats = {
    totalPublished: 0,
    totalReceived: 0,
    activeSubscriptions: 0,
    topics: new Map(),
    errors: 0,
  };

  constructor(private config: {
    servers: string[];
    stream?: string;
    user?: string;
    pass?: string;
    token?: string;
  }) {}

  async connect(): Promise<void> {
    try {
      const { connect } = await import('nats');
      
      this.nc = await connect({
        servers: this.config.servers,
        user: this.config.user,
        pass: this.config.pass,
        token: this.config.token,
      });

      const nc = this.nc as Awaited<ReturnType<typeof connect>>;
      this.js = nc.jetstream();

      this.connected = true;
      console.log('[EventBus] NATS JetStream connected to', this.config.servers);
    } catch (error) {
      console.error('[EventBus] NATS connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      const nc = this.nc as { close: () => Promise<void> };
      await nc.close();
    }
    this.connected = false;
    this.subscriptions.clear();
    console.log('[EventBus] NATS JetStream disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish<T>(event: BaseEvent<T>, _options?: PublishOptions): Promise<void> {
    if (!this.connected || !this.js) {
      throw new Error('Event bus not connected');
    }

    const js = this.js as { publish: (subject: string, data: Uint8Array) => Promise<void> };
    const data = new TextEncoder().encode(JSON.stringify(event));
    
    await js.publish(event.topic, data);
    
    this.stats.totalPublished++;
    const topicCount = this.stats.topics.get(event.topic) ?? 0;
    this.stats.topics.set(event.topic, topicCount + 1);
  }

  async subscribe<T>(pattern: string, handler: EventHandler<T>, options?: SubscriptionOptions): Promise<string> {
    if (!this.connected || !this.js) {
      throw new Error('Event bus not connected');
    }

    const js = this.js as {
      subscribe: (subject: string, opts?: Record<string, unknown>) => unknown;
    };
    
    const sub = await js.subscribe(pattern, {
      queue: options?.queue,
      durable: options?.durable,
      config: {
        deliver_policy: options?.replay === 'original' ? 'all' : 'last',
        max_deliver: options?.maxDeliver ?? 3,
        ack_wait: options?.ackWait ?? 30000,
      },
    });

    const id = `nats_sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.subscriptions.set(id, sub);

    // Process messages asynchronously
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const msg of sub as any) {
          try {
            const event = JSON.parse(new TextDecoder().decode(msg.data)) as BaseEvent<T>;
            await handler(event);
            this.stats.totalReceived++;
            if (msg.ack) msg.ack();
          } catch (error) {
            this.stats.errors++;
            this.stats.lastError = error instanceof Error ? error.message : String(error);
            this.stats.lastErrorTime = Date.now();
            if (msg.nak) msg.nak();
          }
        }
      } catch (error) {
        console.error(`[EventBus] Subscription error for ${pattern}:`, error);
      }
    })();

    this.stats.activeSubscriptions = this.subscriptions.size;
    return id;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub && typeof sub === 'object' && 'unsubscribe' in sub) {
      await (sub as { unsubscribe: () => void }).unsubscribe();
    }
    this.subscriptions.delete(subscriptionId);
    this.stats.activeSubscriptions = this.subscriptions.size;
  }

  async request<T, R>(topic: string, payload: T, timeout = 5000): Promise<R> {
    if (!this.connected || !this.nc) {
      throw new Error('Event bus not connected');
    }

    const nc = this.nc as { request: (subject: string, data: Uint8Array, opts: { timeout: number }) => Promise<{ data: Uint8Array }> };
    const data = new TextEncoder().encode(JSON.stringify(payload));
    
    const response = await nc.request(topic, data, { timeout });
    return JSON.parse(new TextDecoder().decode(response.data)) as R;
  }

  async reply<T, R>(_pattern: string, _handler: (payload: T) => R | Promise<R>): Promise<string> {
    throw new Error('NATS reply not yet implemented');
  }

  getStats(): EventBusStats {
    return { ...this.stats };
  }

  async reset(): Promise<void> {
    console.log('[EventBus] NATS reset not implemented - manual stream purge required');
  }
}

// ==================== EVENT BUS MANAGER ====================

/**
 * Global Event Bus Manager
 */
class EventBusManager {
  private static instance: IEventBus | null = null;
  private static initialized = false;

  static getInstance(): IEventBus {
    if (!EventBusManager.instance) {
      EventBusManager.instance = new MemoryEventBus();
    }
    return EventBusManager.instance;
  }

  static async initialize(config: {
    type: 'memory' | 'nats';
    nats?: {
      servers: string[];
      stream?: string;
      user?: string;
      pass?: string;
      token?: string;
    };
  }): Promise<IEventBus> {
    if (EventBusManager.initialized) {
      await EventBusManager.instance?.disconnect();
    }

    if (config.type === 'nats' && config.nats) {
      EventBusManager.instance = new NATSEventBus(config.nats);
    } else {
      EventBusManager.instance = new MemoryEventBus();
    }

    await EventBusManager.instance.connect();
    EventBusManager.initialized = true;

    return EventBusManager.instance;
  }

  static async shutdown(): Promise<void> {
    if (EventBusManager.instance) {
      await EventBusManager.instance.disconnect();
      EventBusManager.instance = null;
      EventBusManager.initialized = false;
    }
  }
}

// ==================== EXPORTS ====================

export const eventBus = EventBusManager.getInstance();
export { EventBusManager };
