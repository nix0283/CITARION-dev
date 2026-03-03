/**
 * RISK MANAGEMENT MODULE INDEX
 */

export { VaRCalculator, calculateVaR, defaultVaRConfig } from './var-calculator';
export { PositionLimiter, calculateKelly, defaultPositionLimits } from './position-limiter';
export { DrawdownMonitor, defaultDrawdownThresholds } from './drawdown-monitor';
export { KillSwitch, defaultKillSwitchConfig, defaultAutoArmConfig, type KillSwitchCallback, type AutoArmCallback } from './kill-switch';
export { 
  KillSwitchManager, 
  getKillSwitchManager, 
  initializeKillSwitchManager, 
  canTradeGlobally 
} from './kill-switch-manager';
export { RiskManager, createRiskManager, defaultRiskManagerConfig } from './risk-manager';
export * from './types';
