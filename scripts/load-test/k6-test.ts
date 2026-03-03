/**
 * Load Testing Script for CITARION
 * Stage 3.5: Load testing with k6
 * 
 * Run: k6 run scripts/load-test.ts
 */

import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Custom metrics
const errorRate = new Rate('errors')
const apiLatency = new Trend('api_latency')
const orderLatency = new Trend('order_latency')
const wsLatency = new Trend('websocket_latency')
const requestsPerSecond = new Counter('requests_per_second')

// ============================================================================
// SCENARIOS
// ============================================================================

export const options = {
  scenarios: {
    // Normal load - steady traffic
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },

    // Peak load - traffic spike
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      startTime: '10m',
      gracefulRampDown: '30s',
    },

    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      startTime: '20m',
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    api_latency: ['p(95)<300'],
    order_latency: ['p(95)<1000'],
  },
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

export default function () {
  // Test different endpoints
  testHealthCheck()
  testMarketData()
  testPositions()
  testBotStatus()
  
  sleep(1)
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/api/health`)

  check(res, {
    'health check status 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  })

  errorRate.add(res.status !== 200)
  requestsPerSecond.add(1)
}

function testMarketData() {
  // Get ticker
  let res = http.get(`${BASE_URL}/api/prices?symbol=BTCUSDT`)

  check(res, {
    'ticker status 200': (r) => r.status === 200,
    'ticker has price': (r) => {
      if (r.status !== 200) return false
      const body = r.json()
      return body.price !== undefined
    },
  })

  errorRate.add(res.status !== 200)
  apiLatency.add(res.timings.duration)

  // Get OHLCV
  res = http.get(`${BASE_URL}/api/ohlcv?symbol=BTCUSDT&interval=1h&limit=100`)

  check(res, {
    'ohlcv status 200': (r) => r.status === 200,
    'ohlcv has candles': (r) => {
      if (r.status !== 200) return false
      const body = r.json()
      return Array.isArray(body.candles) && body.candles.length > 0
    },
  })

  errorRate.add(res.status !== 200)
  apiLatency.add(res.timings.duration)
  requestsPerSecond.add(2)
}

function testPositions() {
  // Get positions (requires auth in real scenario)
  const res = http.get(`${BASE_URL}/api/positions`)

  check(res, {
    'positions status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'positions response time < 500ms': (r) => r.timings.duration < 500,
  })

  // If authenticated, would check position data
  if (res.status === 200) {
    const body = res.json()
    check(res, {
      'positions is array': () => Array.isArray(body.positions),
    })
  }

  apiLatency.add(res.timings.duration)
  requestsPerSecond.add(1)
}

function testBotStatus() {
  const res = http.get(`${BASE_URL}/api/bots/active`)

  check(res, {
    'bots status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'bots response time < 300ms': (r) => r.timings.duration < 300,
  })

  apiLatency.add(res.timings.duration)
  requestsPerSecond.add(1)
}

// ============================================================================
// AUTHENTICATED TESTS (for full load test)
// ============================================================================

export function testAuthenticatedScenario(authToken: string) {
  const headers = { Authorization: `Bearer ${authToken}` }

  // Get user positions
  let res = http.get(`${BASE_URL}/api/positions`, { headers })

  check(res, {
    'auth positions status 200': (r) => r.status === 200,
  })

  // Create test order (paper trading)
  const orderPayload = JSON.stringify({
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'MARKET',
    size: 0.001,
  })

  res = http.post(`${BASE_URL}/api/trade/open`, orderPayload, {
    headers: { ...headers, 'Content-Type': 'application/json' },
  })

  check(res, {
    'create order status 200 or 400': (r) => r.status === 200 || r.status === 400,
    'order response time < 1000ms': (r) => r.timings.duration < 1000,
  })

  orderLatency.add(res.timings.duration)
  requestsPerSecond.add(2)
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

export function setup() {
  console.log('Setting up load test...')
  
  // Verify server is running
  const res = http.get(`${BASE_URL}/api/health`)
  
  if (res.status !== 200) {
    throw new Error(`Server not responding at ${BASE_URL}`)
  }

  console.log('Server is healthy, starting load test...')
  return { baseUrl: BASE_URL }
}

export function teardown(data: any) {
  console.log('Load test completed')
  
  // Could add cleanup here
}

// ============================================================================
// HANDLE SUMMARY
// ============================================================================

export function handleSummary(data: any) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-summary.json': JSON.stringify(data, null, 2),
  }
}
