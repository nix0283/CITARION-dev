/**
 * Copy Trading Module
 * 
 * Модуль для копирования сделок мастер-трейдеров.
 * Включает:
 * - Profit Sharing Engine
 * - Follower Risk Manager
 * - Slippage Protection
 */

export * from "./profit-sharing";
export * from "./follower-risk-manager";
export * from "./slippage-protector";

// Re-export from exchange copy-trading
export * from "../exchange/copy-trading";
