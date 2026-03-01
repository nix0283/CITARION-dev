/**
 * Copy Trading Module
 * 
 * Модуль для копирования сделок мастер-трейдеров.
 * Включает:
 * - Profit Sharing Engine
 * - Follower Risk Manager
 */

export * from "./profit-sharing";
export * from "./follower-risk-manager";

// Re-export from exchange copy-trading
export * from "../exchange/copy-trading";
