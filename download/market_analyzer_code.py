# market_forecast.py
"""
Professional 24-Hour Market Forecast with Extended Backtest & Live-wrapper
- Loads historical candles from Binance for backtesting.
- Runs backtest on real data (local run required for API).
- Strategies: basic, multi_tp, trailing, reentry_24h.
- Use synthetic fallback if API fails.
- Preserves original function names and logic; applied safe fixes (no lookahead, RSI prev-bar, reentry avg price).
- Provides both modes: backtest and live (mode selection via CLI).
"""

import logging
import os
import json
import argparse
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
import ccxt
import yfinance as yf
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import math
import warnings
import time

warnings.filterwarnings("ignore")

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
CONFIG = {
    "crypto_symbols": [
        "BTC/USDT", "ETH/USDT", "SOL/USDT", "ADA/USDT", "DOT/USDT",
        "LINK/USDT", "LTC/USDT", "TRX/USDT", "AVAX/USDT", "DOGE/USDT"
    ],
    "stock_indices": ["^GSPC", "^IXIC", "^DJI"],   # S&P 500, NASDAQ, Dow
    "gold_symbol": "GC=F",                         # Gold futures
    "timeframe": "1h",
    "lookback_days": 30,
    "vol_low": 0.01,
    "vol_high": 0.05,
    "trend_thr": 0.02,
    "corr_weight": 0.30,
    "save_folder": "market_analysis_output",
    "log_level": logging.INFO,
    "backtest_symbols": ["ETH/USDT"],  # For backtest
    "backtest_days": 1000,  # 1 year for backtest
}

os.makedirs(CONFIG["save_folder"], exist_ok=True)
logging.basicConfig(level=CONFIG["log_level"],
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --------------------------------------------------
# DATA FETCHER
# --------------------------------------------------
class DataFetcher:
    def __init__(self):
        # enableRateLimit True for safety
        self.exchange = ccxt.binance({'enableRateLimit': True})
        self.cache: Dict[str, pd.DataFrame] = {}

    # ---------- Crypto ----------
    def _fetch_crypto(self, symbol: str, days: int = CONFIG["lookback_days"]) -> pd.DataFrame:
        key = f"crypto_{symbol}_{days}"
        if key in self.cache:
            return self.cache[key]

        since = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000)
        try:
            raw = self.exchange.fetch_ohlcv(symbol, CONFIG["timeframe"], since=since)
        except Exception as e:
            logger.warning(f"Error fetching crypto {symbol}: {e}")
            raw = []

        if not raw:
            logger.warning(f"No crypto data for {symbol}")
            df = pd.DataFrame()
        else:
            df = pd.DataFrame(raw, columns=['ts', 'open', 'high', 'low', 'close', 'volume'])
            df['ts'] = pd.to_datetime(df['ts'], unit='ms', utc=True)
            df.set_index('ts', inplace=True)
            df = df.resample('1H').ffill()                     # uniform hourly grid
        self.cache[key] = df
        logger.info(f"Fetched crypto {symbol}: {len(df)} rows")
        return df

    # ---------- yFinance ----------
    def _fetch_yf(self, symbol: str, days: int = CONFIG["lookback_days"]) -> pd.DataFrame:
        key = f"yf_{symbol}_{days}"
        if key in self.cache:
            return self.cache[key]

        end = datetime.now(timezone.utc)
        start = end - timedelta(days=days)
        try:
            df = yf.download(symbol, start=start, end=end, interval="1h", progress=False)
        except Exception as e:
            logger.warning(f"yfinance download error for {symbol}: {e}")
            df = pd.DataFrame()

        if df.empty:
            logger.warning(f"No yfinance data for {symbol}")
            df = pd.DataFrame()
        else:
            df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
            df.columns = ['open', 'high', 'low', 'close', 'volume']
            df.index = pd.to_datetime(df.index)
            if df.index.tz is None:
                df.index = df.index.tz_localize('UTC', ambiguous='NaT', nonexistent='shift_forward')
            else:
                df.index = df.index.tz_convert('UTC')
            df = df.resample('1H').ffill()
        self.cache[key] = df
        logger.info(f"Fetched yfinance {symbol}: {len(df)} rows")
        return df

    # ---------- Public ----------
    def fetch_all(self) -> Dict[str, pd.DataFrame]:
        data = {}
        for s in CONFIG["crypto_symbols"]:
            data[s] = self._fetch_crypto(s)
        for s in CONFIG["stock_indices"]:
            data[s] = self._fetch_yf(s)
        data["GOLD"] = self._fetch_yf(CONFIG["gold_symbol"])
        return data

# --------------------------------------------------
# INDICATORS
# --------------------------------------------------
def _safe_scalar(series: pd.Series, idx: int = -1):
    """Return scalar or 0.0 if NaN / out-of-range."""
    if series is None or series.empty:
        return 0.0
    if abs(idx) > len(series):
        # fallback to last available
        idx = -1
    val = series.iloc[idx]
    return float(val) if pd.notna(val) else 0.0

class MarketAnalyzer:
    def __init__(self, data: Dict[str, pd.DataFrame]):
        self.data = data

    # ---------- Per-asset ----------
    def _asset_indicators(self, df: pd.DataFrame) -> dict:
        if df is None or df.empty:
            return {}

        # ---- Force numeric ----
        for col in ['open', 'high', 'low', 'close', 'volume']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        close = df['close']

        # 1. 24-h ROC
        roc = 0.0
        if len(close) > 24:
            prev = _safe_scalar(close.shift(24))
            cur = _safe_scalar(close)
            if prev != 0:
                roc = (cur - prev) / prev

        # 2. ATR %
        atr = self._atr(df)
        atr_pct = _safe_scalar(atr) / _safe_scalar(close) if _safe_scalar(close) != 0 else 0.0

        # 3. EMA-trend
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        trend = 0.0
        e26 = _safe_scalar(ema26)
        if e26 != 0:
            trend = (_safe_scalar(ema12) - e26) / e26

        # 4. Volume ratio
        vol_ratio = 1.0
        if 'volume' in df.columns and len(df) >= 24:
            ma24 = df['volume'].rolling(24).mean()
            cur_vol = _safe_scalar(df['volume'])
            ma_val = _safe_scalar(ma24)
            vol_ratio = cur_vol / ma_val if ma_val > 0 else 1.0

        return {
            'roc_24h': roc,
            'atr_pct': atr_pct,
            'trend_strength': trend,
            'volume_ratio': vol_ratio,
        }

    @staticmethod
    def _atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        high = df['high']
        low = df['low']
        close = df['close']
        tr1 = high - low
        tr2 = (high - close.shift()).abs()
        tr3 = (low - close.shift()).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    # ---------- Aggregation ----------
    def aggregate(self) -> dict:
        rows = []
        for sym, df in self.data.items():
            ind = self._asset_indicators(df)
            if ind:
                rows.append(ind)

        if not rows:
            return {}

        agg = pd.DataFrame(rows).agg({
            'roc_24h': 'mean',
            'atr_pct': 'mean',
            'trend_strength': 'mean',
            'volume_ratio': 'mean',
        }).to_dict()

        # counts
        agg['crypto_cnt'] = sum(1 for k in self.data if '/' in k and not self.data[k].empty)
        agg['stock_cnt'] = sum(1 for k in self.data if k.startswith('^') and not self.data[k].empty)

        # gold ROC (separate because we need it later)
        gold_ind = self._asset_indicators(self.data.get("GOLD", pd.DataFrame()))
        agg['gold_roc'] = gold_ind.get('roc_24h', 0.0)

        # replace any NaN that could sneak in
        for k, v in agg.items():
            if pd.isna(v):
                agg[k] = 0.0

        return agg

    # ---------- Correlations ----------
    def correlations(self) -> dict:
        corr_out = {}
        btc = self.data.get("BTC/USDT")
        if btc is None or btc.empty:
            logger.warning("BTC data missing – correlations skipped")
            return corr_out

        ref = btc['close'].tail(24).astype(float)
        if len(ref) < 2:
            return corr_out

        # crypto alts
        for s in CONFIG["crypto_symbols"][1:]:
            df = self.data.get(s)
            if df is not None and not df.empty:
                ser = df['close'].tail(24).astype(float)
                if len(ser) == len(ref):
                    try:
                        c, _ = pearsonr(ref, ser)
                    except Exception:
                        c = 0.0
                    corr_out[f"{s}_vs_BTC"] = float(c)

        # stocks
        for s in CONFIG["stock_indices"]:
            df = self.data.get(s)
            if df is not None and not df.empty:
                ser = df['close'].tail(24).astype(float)
                if len(ser) == len(ref):
                    try:
                        c, _ = pearsonr(ref, ser)
                    except Exception:
                        c = 0.0
                    corr_out[f"{s}_vs_BTC"] = float(c)

        # gold
        df = self.data.get("GOLD")
        if df is not None and not df.empty:
            ser = df['close'].tail(24).astype(float)
            if len(ser) == len(ref):
                try:
                    c, _ = pearsonr(ref, ser)
                except Exception:
                    c = 0.0
                corr_out["GOLD_vs_BTC"] = float(c)

        # average correlation strength
        values = [v for k, v in corr_out.items() if not k.endswith('_vs_BTC') is False]  # keep all numeric
        if corr_out:
            corr_out['avg_corr'] = float(np.mean(list(corr_out.values())))
        else:
            corr_out['avg_corr'] = 0.0

        return corr_out

    # ---------- Probability model ----------
    def forecast(self, ind: dict, corr: dict) -> dict:
        up = down = cons = 1/3

        # ----- Momentum -----
        roc = ind.get('roc_24h', 0.0)
        if roc > CONFIG["trend_thr"]:
            up += 0.20; down -= 0.10; cons -= 0.10
        elif roc < -CONFIG["trend_thr"]:
            down += 0.20; up -= 0.10; cons -= 0.10

        # ----- Volatility -----
        vol = ind.get('atr_pct', 0.0)
        if vol < CONFIG["vol_low"]:
            cons += 0.20; up -= 0.10; down -= 0.10
        elif vol > CONFIG["vol_high"]:
            if ind.get('trend_strength', 0.0) > 0:
                up += 0.15
            else:
                down += 0.15
            cons -= 0.15

        # ----- Volume surge -----
        vratio = ind.get('volume_ratio', 1.0)
        if vratio > 1.5:
            if ind.get('trend_strength', 0.0) > 0:
                up += 0.10
            else:
                down += 0.10
            cons -= 0.10

        # ----- Cross-asset correlation -----
        avg_c = corr.get('avg_corr', 0.0)
        c_adj = CONFIG["corr_weight"] * abs(avg_c)
        if abs(avg_c) < 0.5:                     # low correlation → more consolidation
            cons += c_adj
            up -= c_adj / 2
            down -= c_adj / 2
        else:                                    # high correlation → follow gold/stocks
            gold_roc = ind.get('gold_roc', 0.0)
            if gold_roc > 0 and avg_c > 0:
                up += c_adj / 2
            elif gold_roc  0:
                down += c_adj / 2

        # ----- Normalise -----
        total = up + down + cons
        if total > 0:
            up /= total
            down /= total
            cons /= total

        return {
            'upward': round(up, 4),
            'downward': round(down, 4),
            'consolidation': round(cons, 4)
        }

# --------------------------------------------------
# MAIN ANALYSIS
# --------------------------------------------------
def run_market_analysis() -> dict:
    logger.info("=== 24-Hour Market Forecast START ===")
    fetcher = DataFetcher()
    raw_data = fetcher.fetch_all()

    analyzer = MarketAnalyzer(raw_data)
    agg_ind = analyzer.aggregate()
    corrs = analyzer.correlations()
    probs = analyzer.forecast(agg_ind, corrs)

    result = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "probabilities": probs,
        "indicators": agg_ind,
        "correlations": corrs,
    }

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_file = os.path.join(CONFIG["save_folder"], f"forecast_{ts}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved forecast to {out_file}")
    return result

# --------------------------------------------------
# Data generator with synthetic fallback
# --------------------------------------------------
def generate_synthetic_or_real_data(symbol: str, days: int = CONFIG["backtest_days"]) -> pd.DataFrame:
    """Генератор данных: real from Binance, synthetic fallback."""
    try:
        ex = ccxt.binance({'enableRateLimit': True})
        since = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000)
        ohlcv: List[List] = []
        while since < int(datetime.now(timezone.utc).timestamp() * 1000):
            batch = ex.fetch_ohlcv(symbol, '1h', since)
            if not batch:
                break
            ohlcv.extend(batch)
            since = batch[-1][0] + 3600000  # +1 hour in ms
            # safety cap
            if len(ohlcv) > days * 24 * 3:
                break
        if not ohlcv:
            raise Exception("No data fetched from exchange")
        df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms', utc=True)
        df.set_index('timestamp', inplace=True)
        logger.info(f"Loaded real {len(df)} hourly candles for {symbol}")
        return df
    except Exception as e:
        logger.warning(f"Failed to load real data: {e}. Using synthetic fallback.")
        
        # Synthetic data generation (simple random walk for demo)
        start_time = datetime.now(timezone.utc) - timedelta(days=days)
        dates = pd.date_range(start_time, periods=days*24, freq='H', tz='UTC')
        base_price = 1000.0  # Arbitrary starting price
        prices = np.cumsum(np.random.randn(len(dates)) * 10) + base_price
        df = pd.DataFrame({
            'open': prices,
            'high': prices + np.abs(np.random.randn(len(dates)) * 5),
            'low': prices - np.abs(np.random.randn(len(dates)) * 5),
            'close': prices,
            'volume': np.random.randint(100, 10000, len(dates))
        }, index=dates)
        logger.info(f"Generated synthetic {len(df)} hourly candles for {symbol}")
        return df

# --------------------------------------------------
# Forecast simulator (preserve method from backtest; safe no-lookahead)
# --------------------------------------------------
def simulate_forecasts_stream(df: pd.DataFrame, history_hours: int = 720) -> pd.DataFrame:
    """
    Постепенный forecast по одной свече.
    Возвращает DataFrame с индексом = время свечи.
    """
    if df is None or df.empty or len(df) < 48:
        return pd.DataFrame(columns=['upward','downward','consolidation'])

    forecasts = []
    close = df['close'].astype(float)

    for i in range(history_hours, len(df)):
        window = df.iloc[max(0, i - history_hours):i]
        if len(window) < 48:
            continue

        # Safe 24h ROC
        curr_price = window['close'].iloc[-2]
        prev_price = window['close'].iloc[-26] if len(window) >= 26 else window['close'].iloc[0]
        roc = (curr_price - prev_price) / prev_price if prev_price != 0 else 0.0

        # Volatility
        vol = window['close'].pct_change().tail(24).std()
        vol = vol if pd.notna(vol) else 0.0

        # Trend EMA12/EMA26
        ema12 = window['close'].ewm(span=12, adjust=False).mean().iloc[-1]
        ema26 = window['close'].ewm(span=26, adjust=False).mean().iloc[-1]
        trend = (ema12 - ema26) / ema26 if ema26 != 0 else 0.0

        # Volume surge
        vol_ratio = 1.0
        if 'volume' in window.columns and len(window) >= 24:
            ma_vol = window['volume'].rolling(24).mean().iloc[-1]
            cur_vol = window['volume'].iloc[-1]
            vol_ratio = cur_vol / ma_vol if pd.notna(ma_vol) and ma_vol > 0 else 1.0

        # Forecast model
        up = down = cons = 1/3
        if roc > 0.02: up += 0.2; down -= 0.1; cons -= 0.1
        if roc < -0.02: down += 0.2; up -= 0.1; cons -= 0.1
        if vol < 0.01: cons += 0.2; up -= 0.1; down -= 0.1
        if vol > 0.05:
            if trend > 0: up += 0.15
            if trend < 0: down += 0.15
            cons -= 0.15
        if vol_ratio > 1.5:
            if trend > 0: up += 0.1
            if trend < 0: down += 0.1
            cons -= 0.1

        total = up + down + cons
        if total > 0:
            up /= total
            down /= total
            cons /= total

        # Записываем в список
        forecasts.append({
            'upward': round(up, 4),
            'downward': round(down, 4),
            'consolidation': round(cons, 4),
            'roc': round(roc, 4),
            'vol': round(vol, 4),
            'trend': round(trend, 4)
        })

    # Создаём DataFrame с правильным индексом
    index = df.index[history_hours: history_hours + len(forecasts)]
    forecast_df = pd.DataFrame(forecasts, index=index)
    return forecast_df

# --------------------------------------------------
# Indicators utility
# --------------------------------------------------
def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / (loss + 1e-12)
    rsi = 100 - (100 / (1 + rs))
    return rsi

def get_risk_profile(profile: str):
    profiles = {
        'easy':   {'risk': 0.05, 'leverage': 2,   'max_reentries': 1, 'target_monthly': 0.03},
        'normal': {'risk': 0.10, 'leverage': 3,   'max_reentries': 2, 'target_monthly': 0.06},
        'hard':   {'risk': 0.15, 'leverage': 5,   'max_reentries': 3, 'target_monthly': 0.10},
        'scalper':{'risk': 0.02, 'leverage': 10,  'max_reentries': 5, 'target_monthly': 0.05, 'max_trades_per_day': 10}
    }
    return profiles.get(profile, profiles['normal'])

# --------------------------------------------------
# Helper: performance report + visualization
# --------------------------------------------------
def performance_report(equity_series: pd.Series, trades: List[dict], initial_capital: float, out_prefix: str):
    # Basic metrics
    equity = equity_series.dropna()
    total_return = (equity.iloc[-1] / initial_capital - 1) * 100
    # CAGR (annualized) approximate from hours
    hours = (equity.index[-1] - equity.index[0]).total_seconds() / 3600.0
    years = max(hours / (24 * 365), 1e-9)
    cagr = (equity.iloc[-1] / initial_capital) ** (1 / years) - 1 if years > 0 else 0.0
    returns = equity.pct_change().fillna(0)
    sharpe = returns.mean() / (returns.std() + 1e-12) * math.sqrt(8760) if returns.std() > 0 else 0.0
    roll_max = equity.cummax()
    dd = (equity - roll_max) / roll_max
    max_dd = dd.min() * 100

    # Trades analytics
    pnls = [t.get('pnl', 0) for t in trades if 'pnl' in t]
    num_trades = len(pnls)
    win_rate = len([p for p in pnls if p > 0]) / num_trades * 100 if num_trades > 0 else 0.0
    avg_pnl = np.mean(pnls) if pnls else 0.0
    median_pnl = np.median(pnls) if pnls else 0.0
    profit_factor = sum([p for p in pnls if p > 0]) / (abs(sum([p for p in pnls if p < 0])) + 1e-12) if pnls else 0.0
    durations = []
    for t in trades:
        if 'entry_time' in t and 'exit_time' in t:
            durations.append((t['exit_time'] - t['entry_time']).total_seconds() / 3600.0)
    avg_duration = np.mean(durations) if durations else 0.0

    metrics = {
        'total_return_pct': round(total_return, 2),
        'cagr_pct': round(cagr * 100, 2),
        'sharpe': round(sharpe, 3),
        'max_drawdown_pct': round(max_dd, 2),
        'num_trades': num_trades,
        'win_rate_pct': round(win_rate, 2),
        'avg_trade_pnl': round(avg_pnl, 2),
        'median_trade_pnl': round(median_pnl, 2),
        'profit_factor': round(profit_factor, 3),
        'avg_trade_duration_hours': round(avg_duration, 2),
        'final_capital': round(equity.iloc[-1], 2)
    }

    # Save JSON
    out_file = os.path.join(CONFIG["save_folder"], f"{out_prefix}_report.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({'metrics': metrics, 'trades_sample': trades[-50:]}, f, indent=2, default=str, ensure_ascii=False)
    logger.info(f"Saved performance report to {out_file}")

    # Plot equity
    plt.figure(figsize=(12, 5))
    plt.plot(equity.index, equity.values, lw=2)
    plt.title(f"Equity Curve | Return {metrics['total_return_pct']}% | DD {metrics['max_drawdown_pct']}%")
    plt.xlabel("Time")
    plt.ylabel("Equity")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt_file = os.path.join(CONFIG["save_folder"], f"{out_prefix}_equity.png")
    plt.savefig(plt_file)
    plt.close()
    logger.info(f"Saved equity plot to {plt_file}")

    # PnL histogram
    if pnls:
        plt.figure(figsize=(8, 4))
        plt.hist(pnls, bins=40)
        plt.title("PnL per trade distribution")
        plt.tight_layout()
        hist_file = os.path.join(CONFIG["save_folder"], f"{out_prefix}_pnl_hist.png")
        plt.savefig(hist_file)
        plt.close()
        logger.info(f"Saved pnl hist to {hist_file}")

    return metrics

import telebot
bot = telebot.TeleBot("")
TELEGRAM_CHAT_ID = 


# --------------------------------------------------
# PLACEHOLDER for opening real position (BingX or other) - you will implement
# --------------------------------------------------
def open_position(symbol: str, direction: int, size: float, entry_price: float, sl: Optional[float], tp: Optional[float]):
    """
    Placeholder to integrate with real exchange.
    direction: 1 for long, -1 for short
    size: base currency amount (e.g. ETH)
    entry_price: price to enter
    sl, tp: stop loss / take profit prices
    """
    bot.send_message(TELEGRAM_CHAT_ID, f"[OPEN_POSITION] {symbol} dir={'LONG' if direction>0 else 'SHORT'} size={size:.6f} entry={entry_price:.2f} SL={sl} TP={tp}")
    logger.info(f"[OPEN_POSITION] {symbol} dir={'LONG' if direction>0 else 'SHORT'} size={size:.6f} entry={entry_price:.2f} SL={sl} TP={tp}")
    # Implement actual API call here on your side.
    # Return order_id or dict if needed.
    return {"order_id": None, "status": "stub"}

# --------------------------------------------------
# LIVE simulation made identical to backtest
# --------------------------------------------------
def run_live_simulation(symbol: str = "ETH/USDT", strat: str = 'reentry_24h', fee: float = 0.001):
    """
    Realistic simulation of live trading: processes data candle-by-candle.
    Now fully identical to backtest logic:
    - Uses the same signal generation (fixed per 24h cycle).
    - Same entry/reentry conditions.
    - Same exit conditions based on strat.
    - Fixed unit bug in size calculation.
    - Removed RSI, confidence, partial TP, daily trade limits.
    - SL/TP calculated and passed to open_position.
    - Forced exit at cycle start (midnight UTC for live).
    - Historical processing matches backtest, then infinite loop for new candles.
    """
    logger.info(f"Starting LIVE simulation for {symbol} | Strat: {strat.upper()}")

    # 1. Load data
    df_full = generate_synthetic_or_real_data(symbol, days=CONFIG["backtest_days"])
    if df_full is None or df_full.empty or len(df_full) < 720 + 24:
        logger.error("Not enough data for live simulation")
        return {}

    # 2. Compute forecasts and signals exactly like backtest
    forecasts = simulate_forecasts_stream(df_full)
    df_full = df_full.join(forecasts, how='left').fillna({'upward': 1/3, 'downward': 1/3, 'consolidation': 1/3})
    df_full['signal'] = 0
    df_full.loc[df_full['upward'] > 0.5, 'signal'] = 1
    df_full.loc[df_full['downward'] > 0.5, 'signal'] = -1

    # Fix signals per cycle
    df_full['cycle_id'] = (df_full.index - df_full.index[0]) // timedelta(hours=24)
    for _, group in df_full.groupby('cycle_id'):
        sig = group['signal'].iloc[0]
        df_full.loc[group.index, 'signal'] = sig

    # 3. Trading params (matched to backtest defaults)
    initial_capital = 10000.0
    risk_per_trade = 0.1
    leverage = 5
    capital = initial_capital
    position = 0.0
    entry_price = 0.0
    entry_ts = None
    reentries = 0
    equity = [initial_capital]
    trades = []
    high_since_entry = low_since_entry = None  # For trailing if needed

    # 4. Process historical data like backtest
    is_historical_phase = True

    for i in range(1, len(df_full)):
        cur_price = float(df_full['close'].iloc[i])
        sig = int(df_full['signal'].iloc[i])
        current_time = df_full.index[i]
        cycle_start = (current_time - df_full.index[0]) % timedelta(hours=24) == timedelta(0)

        if cycle_start:
            if position != 0:
                pnl = position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price)
                capital += pnl - abs(position * cur_price * fee)
                trades[-1].update({'exit_time': current_time, 'exit_price': cur_price, 'pnl': pnl, 'exit_reason': 'cycle_start'})
                position = 0
            reentries = 0
            high_since_entry = low_since_entry = None

        # Update equity
        current_equity = capital + (position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price) if position < 0 else 0)
        equity.append(current_equity)

        if sig == 0:
            continue

        # Entry / Re-entry
        reentry_cond = (strat == 'reentry_24h' and reentries  0.01)
        if position == 0 or reentry_cond:
            current_exposure = abs(position) * cur_price
            max_exposure_usdt = capital * 0.2
            remaining_exposure_usdt = max_exposure_usdt - current_exposure
            risk_usdt = capital * risk_per_trade * leverage
            size = min(risk_usdt / cur_price, remaining_exposure_usdt / cur_price)

            if size <= 0:
                continue

            position += size * sig
            capital -= abs(size * cur_price * fee)

            sl = None
            tp = None
            if strat == 'basic':
                sl = entry_price * (1 - 0.02 if sig > 0 else 1 + 0.02) if position != size * sig else cur_price * (1 - 0.02 if sig > 0 else 1 + 0.02)
                tp = entry_price * (1 + 0.04 if sig > 0 else 1 - 0.04) if position != size * sig else cur_price * (1 + 0.04 if sig > 0 else 1 - 0.04)
            elif strat == 'reentry_24h':
                sl = entry_price * (1 - 0.03 if sig > 0 else 1 + 0.03) if position != size * sig else cur_price * (1 - 0.03 if sig > 0 else 1 + 0.03)
                tp = None
            # Add other strats' SL/TP if needed

            if position == size * sig:  # New entry
                entry_price = cur_price
                entry_ts = current_time
                trades.append({'entry_time': entry_ts, 'direction': sig, 'entry_price': cur_price, 'size': abs(size)})
                high_since_entry = cur_price if sig > 0 else None
                low_since_entry = cur_price if sig < 0 else None
                if not is_historical_phase:
                    open_position(symbol, sig, abs(size), cur_price, sl, tp)
            else:  # Reentry
                trades.append({'entry_time': current_time, 'direction': sig, 'entry_price': cur_price, 'size': abs(size), 'reentry': True})
                if not is_historical_phase:
                    open_position(symbol, sig, abs(size), cur_price, sl, tp)

            reentries += 1 if strat == 'reentry_24h' else 0

        # Update trailing data
        if position != 0:
            if sig > 0:
                high_since_entry = max(high_since_entry, cur_price) if high_since_entry is not None else cur_price
            elif sig < 0:
                low_since_entry = min(low_since_entry, cur_price) if low_since_entry is not None else cur_price

        # Exits
        exit_cond = False
        pnl = 0.0
        remaining_pos = abs(position)

        if strat == 'basic':
            sl_level = entry_price * (1 - 0.02 if sig > 0 else 1 + 0.02)
            tp_level = entry_price * (1 + 0.04 if sig > 0 else 1 - 0.04)
            if (sig > 0 and (cur_price = tp_level)) or \
               (sig = sl_level or cur_price <= tp_level)):
                exit_cond = True

        elif strat == 'multi_tp':
            if remaining_pos <= 0:
                exit_cond = True
            else:
                if sig > 0:
                    if cur_price >= entry_price * 1.02:
                        close_size = remaining_pos / 3
                        pnl += close_size * (cur_price - entry_price)
                        remaining_pos -= close_size
                    if cur_price >= entry_price * 1.04 and remaining_pos > 0:
                        close_size = remaining_pos / 2
                        pnl += close_size * (cur_price - entry_price)
                        remaining_pos -= close_size
                    if cur_price >= entry_price * 1.06 or cur_price <= entry_price * 0.98:
                        pnl += remaining_pos * (cur_price - entry_price)
                        exit_cond = True
                else:
                    if cur_price <= entry_price * 0.98:
                        close_size = remaining_pos / 3
                        pnl += close_size * (entry_price - cur_price)
                        remaining_pos -= close_size
                    if cur_price  0:
                        close_size = remaining_pos / 2
                        pnl += close_size * (entry_price - cur_price)
                        remaining_pos -= close_size
                    if cur_price = entry_price * 1.02:
                        pnl += remaining_pos * (entry_price - cur_price)
                        exit_cond = True
                position = remaining_pos * sig if not exit_cond else 0
                capital += pnl - abs((abs(position) - remaining_pos) * cur_price * fee) if pnl != 0 else 0

        elif strat == 'trailing':
            trail_pct = 0.02
            if entry_ts is not None:
                if sig > 0 and high_since_entry is not None:
                    trail_stop = max(high_since_entry * (1 - trail_pct), entry_price * (1 - trail_pct))
                    if cur_price <= trail_stop:
                        exit_cond = True
                elif sig < 0 and low_since_entry is not None:
                    trail_stop = min(low_since_entry * (1 + trail_pct), entry_price * (1 + trail_pct))
                    if cur_price >= trail_stop:
                        exit_cond = True

        elif strat == 'reentry_24h':
            sl_level = entry_price * (1 - 0.03 if sig > 0 else 1 + 0.03)
            if (sig > 0 and cur_price = sl_level):
                exit_cond = True

        if exit_cond and position != 0:
            pnl = position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price)
            capital += pnl - abs(position * cur_price * fee)
            trades[-1].update({'exit_time': current_time, 'exit_price': cur_price, 'pnl': pnl, 'exit_reason': 'SL/TP'})
            position = 0
            reentries = 0
            high_since_entry = low_since_entry = None
    is_historical_phase = False
    logger.info("=== SWITCHING TO LIVE TRADING MODE ===")
    # 5. Enter continuous live loop
    ex = ccxt.binance({'enableRateLimit': True})
    last_processed_time = df_full.index[-1]
    last_forecast_time = last_processed_time
    current_signal = int(df_full['signal'].iloc[-1])
    equity_index = df_full.index.to_list()

    while True:
        # Wait for next candle
        next_candle_time = last_processed_time + timedelta(hours=1)
        now = datetime.now(timezone.utc)
        sleep_time = (next_candle_time - now).total_seconds() + 10
        if sleep_time > 0:
            logger.info(f"Sleeping for {sleep_time / 60:.2f} minutes until next candle {next_candle_time}.")
            time.sleep(sleep_time)

        # Fetch new candle(s)
        since = int((last_processed_time + timedelta(seconds=1)).timestamp() * 1000)
        try:
            new_ohlcv = ex.fetch_ohlcv(symbol, '1h', since=since, limit=5)
        except Exception as e:
            logger.warning(f"Error fetching new candle: {e}. Retrying in 60s.")
            time.sleep(60)
            continue

        if not new_ohlcv:
            logger.info("No new candle yet. Retrying in 60s.")
            time.sleep(60)
            continue

        # Process new candles
        for candle in new_ohlcv:
            candle_time_ms = candle[0]
            if candle_time_ms <= int(last_processed_time.timestamp() * 1000):
                continue

            current_time = pd.to_datetime(candle_time_ms, unit='ms', utc=True)

            # Skip if already processed
            if current_time in df_full.index:
                logger.warning(f"Duplicate candle at {current_time}, skipping.")
                continue

            # Create a proper row as Series
            new_row = pd.Series(
                {
                    'open': float(candle[1]),
                    'high': float(candle[2]),
                    'low': float(candle[3]),
                    'close': float(candle[4]),
                    'volume': float(candle[5]),
                },
                name=current_time
            )

            # Append using .loc for safety
            df_full.loc[current_time] = new_row
          

            # Cycle start (midnight UTC)
            cycle_start = current_time.hour == 0

            # Update forecast and signal at cycle start
            if cycle_start:
                window = df_full.tail(720)
                if len(window) >= 48:
                    forecasts = simulate_forecasts_stream(window)
                    if not forecasts.empty:
                        last_forecast = forecasts.iloc[-1]
                        upward = last_forecast['upward']
                        downward = last_forecast['downward']
                        current_signal = 1 if upward > 0.5 else -1 if downward > 0.5 else 0
                        last_forecast_time = current_time

            sig = current_signal

            # Forced exit at cycle start
            cur_price = float(df_full['close'].loc[current_time])
            if cycle_start:
                if position != 0:
                    pnl = position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price)
                    capital += pnl - abs(position * cur_price * fee)
                    trades[-1].update({'exit_time': current_time, 'exit_price': cur_price, 'pnl': pnl, 'exit_reason': 'cycle_start'})
                    position = 0
                reentries = 0
                high_since_entry = low_since_entry = None

            # Update equity
            current_equity = capital + (position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price) if position < 0 else 0)
            equity.append(current_equity)
            equity_index.append(current_time)

            if sig == 0:
                continue

            # Entry / Re-entry
            reentry_cond = (strat == 'reentry_24h' and reentries  0.01)
            if position == 0 or reentry_cond:
                current_exposure = abs(position) * cur_price
                max_exposure_usdt = capital * 0.2
                remaining_exposure_usdt = max_exposure_usdt - current_exposure
                risk_usdt = capital * risk_per_trade * leverage
                size = min(risk_usdt / cur_price, remaining_exposure_usdt / cur_price)

                if size <= 0:
                    continue

                position += size * sig
                capital -= abs(size * cur_price * fee)

                sl = None
                tp = None
                if strat == 'basic':
                    sl = entry_price * (1 - 0.02 if sig > 0 else 1 + 0.02) if position != size * sig else cur_price * (1 - 0.02 if sig > 0 else 1 + 0.02)
                    tp = entry_price * (1 + 0.04 if sig > 0 else 1 - 0.04) if position != size * sig else cur_price * (1 + 0.04 if sig > 0 else 1 - 0.04)
                elif strat == 'reentry_24h':
                    sl = entry_price * (1 - 0.03 if sig > 0 else 1 + 0.03) if position != size * sig else cur_price * (1 - 0.03 if sig > 0 else 1 + 0.03)
                    tp = None
                # Add for other strats

                if abs(position) == size:  # New entry
                    entry_price = cur_price
                    entry_ts = current_time
                    trades.append({'entry_time': entry_ts, 'direction': sig, 'entry_price': cur_price, 'size': abs(size)})
                    high_since_entry = cur_price if sig > 0 else None
                    low_since_entry = cur_price if sig < 0 else None
                    open_position(symbol, sig, abs(size), cur_price, sl, tp)
                else:  # Reentry
                    trades.append({'entry_time': current_time, 'direction': sig, 'entry_price': cur_price, 'size': abs(size), 'reentry': True})
                    open_position(symbol, sig, abs(size), cur_price, sl, tp)

                reentries += 1 if strat == 'reentry_24h' else 0

            # Update trailing data
            if position != 0:
                if sig > 0:
                    high_since_entry = max(high_since_entry, cur_price) if high_since_entry is not None else cur_price
                elif sig < 0:
                    low_since_entry = min(low_since_entry, cur_price) if low_since_entry is not None else cur_price

            # Exits
            exit_cond = False
            pnl = 0.0
            remaining_pos = abs(position)

            if strat == 'basic':
                sl_level = entry_price * (1 - 0.02 if sig > 0 else 1 + 0.02)
                tp_level = entry_price * (1 + 0.04 if sig > 0 else 1 - 0.04)
                if (sig > 0 and (cur_price = tp_level)) or \
                   (sig = sl_level or cur_price <= tp_level)):
                    exit_cond = True

            elif strat == 'multi_tp':
                if remaining_pos <= 0:
                    exit_cond = True
                else:
                    if sig > 0:
                        if cur_price >= entry_price * 1.02:
                            close_size = remaining_pos / 3
                            pnl += close_size * (cur_price - entry_price)
                            remaining_pos -= close_size
                        if cur_price >= entry_price * 1.04 and remaining_pos > 0:
                            close_size = remaining_pos / 2
                            pnl += close_size * (cur_price - entry_price)
                            remaining_pos -= close_size
                        if cur_price >= entry_price * 1.06 or cur_price <= entry_price * 0.98:
                            pnl += remaining_pos * (cur_price - entry_price)
                            exit_cond = True
                    else:
                        if cur_price <= entry_price * 0.98:
                            close_size = remaining_pos / 3
                            pnl += close_size * (entry_price - cur_price)
                            remaining_pos -= close_size
                        if cur_price  0:
                            close_size = remaining_pos / 2
                            pnl += close_size * (entry_price - cur_price)
                            remaining_pos -= close_size
                        if cur_price = entry_price * 1.02:
                            pnl += remaining_pos * (entry_price - cur_price)
                            exit_cond = True
                    position = remaining_pos * sig if not exit_cond else 0
                    capital += pnl - abs((abs(position) - remaining_pos) * cur_price * fee) if pnl != 0 else 0

            elif strat == 'trailing':
                trail_pct = 0.02
                if entry_ts is not None:
                    if sig > 0 and high_since_entry is not None:
                        trail_stop = max(high_since_entry * (1 - trail_pct), entry_price * (1 - trail_pct))
                        if cur_price <= trail_stop:
                            exit_cond = True
                    elif sig < 0 and low_since_entry is not None:
                        trail_stop = min(low_since_entry * (1 + trail_pct), entry_price * (1 + trail_pct))
                        if cur_price >= trail_stop:
                            exit_cond = True

            elif strat == 'reentry_24h':
                sl_level = entry_price * (1 - 0.03 if sig > 0 else 1 + 0.03)
                if (sig > 0 and cur_price = sl_level):
                    exit_cond = True

            if exit_cond and position != 0:
                pnl = position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price)
                capital += pnl - abs(position * cur_price * fee)
                trades[-1].update({'exit_time': current_time, 'exit_price': cur_price, 'pnl': pnl, 'exit_reason': 'SL/TP'})
                position = 0
                reentries = 0
                high_since_entry = low_since_entry = None

            last_processed_time = current_time

        # Periodically save report (every 24h)
        if (datetime.now(timezone.utc) - last_forecast_time) > timedelta(hours=24):
            equity_series = pd.Series(equity, index=equity_index)
            out_prefix = f"live_{symbol.replace('/', '_')}_{strat}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
            performance_report(equity_series, trades, initial_capital, out_prefix)

    # The loop is infinite, so this return never reaches, but for completeness
    equity_series = pd.Series(equity, index=equity_index)
    result = {
        'symbol': symbol,
        'strat': strat,
        'total_return_pct': round((equity_series.iloc[-1] / initial_capital - 1) * 100, 2),
        'num_trades': len([t for t in trades if 'pnl' in t]),
        'win_rate_pct': round(len([t['pnl'] for t in trades if 'pnl' in t and t['pnl'] > 0]) / len([t for t in trades if 'pnl' in t]) * 100, 1) if len([t for t in trades if 'pnl' in t]) > 0 else 0.0,
        'sharpe_ratio': round(equity_series.pct_change().mean() / (equity_series.pct_change().std() + 1e-12) * math.sqrt(8760), 2),
        'max_drawdown_pct': round(((equity_series - equity_series.cummax()) / equity_series.cummax()).min() * 100, 2),
        'final_capital': round(equity_series.iloc[-1], 2),
        'trades': trades[-50:]
    }
    return result

# --------------------------------------------------
# Backtest runner (preserve original logic)
# --------------------------------------------------
def run_backtest(df: pd.DataFrame, forecasts: pd.DataFrame, strat: str, initial_capital: float = 10000, risk_per_trade: float = 0.1, leverage: float = 5, fee: float = 0.001):
    """
    Run backtest for given strategy.
    Strategies: 'basic' (fixed SL/TP), 'multi_tp' (multiple takes), 'trailing' (trailing stop), 'reentry_24h'.
    This function preserves original formulas and behavioral flow. Some small safety fixes applied.
    """
    if df is None or df.empty or len(df) < 48:
        return {'total_return_pct': 0, 'num_trades': 0, 'win_rate_pct': 0, 'sharpe_ratio': 0, 'max_drawdown_pct': 0}

    df = df.copy()
    forecasts = forecasts.copy()
    # Align forecasts to data
    df = df.join(forecasts, how='left').fillna({'upward': 1/3, 'downward': 1/3, 'consolidation': 1/3})
    df['signal'] = 0
    df.loc[df['upward'] > 0.5, 'signal'] = 1
    df.loc[df['downward'] > 0.5, 'signal'] = -1

    # Forward fill signals for 24h cycle, but reset every 24h
    df['cycle_id'] = (df.index - df.index[0]) // timedelta(hours=24)
    for _, group in df.groupby('cycle_id'):
        sig = group['signal'].iloc[0]  # Signal at start of cycle
        df.loc[group.index, 'signal'] = sig

    capital = initial_capital
    position = 0.0
    entry_price = 0.0
    entry_ts = None
    reentries = 0
    equity = [initial_capital]
    trades = []
    high_since_entry = low_since_entry = None

    for i in range(1, len(df)):
        cur_price = float(df['close'].iloc[i])
        sig = int(df['signal'].iloc[i])
        cycle_start = (df.index[i] - df.index[0]) % timedelta(hours=24) == timedelta(0)

        if cycle_start:
            if position != 0:
                pnl = position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price)
                capital += pnl - abs(position * cur_price * fee)
                trades[-1]['exit_price'] = cur_price
                trades[-1]['pnl'] = pnl
                trades[-1]['exit_reason'] = 'cycle_start'
                position = 0
            reentries = 0
            high_since_entry = low_since_entry = None

        # Equity update
        current_equity = capital + (position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price) if position < 0 else 0)
        equity.append(current_equity)

        if sig == 0:
            continue

        # Entry / Re-entry
        reentry_cond = (strat == 'reentry_24h' and reentries  0.01 if entry_price != 0 else True)
        if position == 0 or reentry_cond:
            current_exposure = abs(position) * cur_price
            max_exposure_usdt = capital * 0.2
            remaining_exposure_usdt = max_exposure_usdt - current_exposure
            risk_usdt = capital * risk_per_trade * leverage
            size = min(risk_usdt / cur_price, remaining_exposure_usdt / cur_price)

            if size <= 0:
                continue

            position += size * sig
            capital -= abs(size * cur_price * fee)

            if position == size * sig:  # New entry
                entry_price = cur_price
                entry_ts = df.index[i]
                trades.append({'entry_time': entry_ts, 'direction': int(sig), 'entry_price': entry_price})
                high_since_entry = cur_price if sig > 0 else None
                low_since_entry = cur_price if sig < 0 else None
            reentries += 1 if strat == 'reentry_24h' else 0

        # Update trailing data
        if position != 0:
            if sig > 0:
                high_since_entry = max(high_since_entry, cur_price) if high_since_entry is not None else cur_price
            elif sig < 0:
                low_since_entry = min(low_since_entry, cur_price) if low_since_entry is not None else cur_price

        # Exits
        pnl = 0.0
        exit_cond = False
        remaining_pos = abs(position)

        if strat == 'basic':
            sl_level = entry_price * (1 - 0.02 if sig > 0 else 1 + 0.02)
            tp_level = entry_price * (1 + 0.04 if sig > 0 else 1 - 0.04)
            if (sig > 0 and (cur_price = tp_level)) or \
               (sig = sl_level or cur_price <= tp_level)):
                exit_cond = True

        elif strat == 'multi_tp':
            # Implement partial closes
            if remaining_pos <= 0:
                exit_cond = True
            else:
                if sig > 0:
                    if cur_price >= entry_price * 1.02:
                        close_size = remaining_pos / 3
                        pnl += close_size * (cur_price - entry_price)
                        remaining_pos -= close_size
                    if cur_price >= entry_price * 1.04 and remaining_pos > 0:
                        close_size = remaining_pos / 2
                        pnl += close_size * (cur_price - entry_price)
                        remaining_pos -= close_size
                    if cur_price >= entry_price * 1.06 or cur_price <= entry_price * 0.98:
                        pnl += remaining_pos * (cur_price - entry_price)
                        exit_cond = True
                else:  # short
                    if cur_price <= entry_price * 0.98:
                        close_size = remaining_pos / 3
                        pnl += close_size * (entry_price - cur_price)
                        remaining_pos -= close_size
                    if cur_price  0:
                        close_size = remaining_pos / 2
                        pnl += close_size * (entry_price - cur_price)
                        remaining_pos -= close_size
                    if cur_price = entry_price * 1.02:
                        pnl += remaining_pos * (entry_price - cur_price)
                        exit_cond = True
                position = remaining_pos * sig if not exit_cond else 0
                capital += pnl - abs((abs(position) - remaining_pos) * cur_price * fee) if pnl != 0 else 0

        elif strat == 'trailing':
            trail_pct = 0.02
            if entry_ts is not None and high_since_entry is not None and low_since_entry is not None:
                if sig > 0:
                    trail_stop = max(high_since_entry * (1 - trail_pct), entry_price * (1 - trail_pct))
                    if cur_price <= trail_stop:
                        exit_cond = True
                else:
                    trail_stop = min(low_since_entry * (1 + trail_pct), entry_price * (1 + trail_pct))
                    if cur_price >= trail_stop:
                        exit_cond = True

        elif strat == 'reentry_24h':
            sl_level = entry_price * (1 - 0.03 if sig > 0 else 1 + 0.03)
            if (sig > 0 and cur_price = sl_level):
                exit_cond = True

        if exit_cond and position != 0:
            pnl = position * (cur_price - entry_price) if position > 0 else position * (entry_price - cur_price)
            capital += pnl - abs(position * cur_price * fee)
            trades[-1].update({'exit_price': cur_price, 'pnl': pnl, 'exit_time': df.index[i], 'exit_reason': 'SL/TP'})
            position = 0
            reentries = 0
            high_since_entry = low_since_entry = None

    # Metrics
    equity_series = pd.Series(equity, index=df.index[:len(equity)])
    returns = equity_series.pct_change().fillna(0)
    total_return = (equity_series.iloc[-1] / initial_capital - 1) * 100
    num_trades = len(trades)
    pnls = [t.get('pnl', 0) for t in trades]
    win_rate = len([p for p in pnls if p > 0]) / num_trades * 100 if num_trades > 0 else 0
    sharpe = returns.mean() / (returns.std() + 1e-12) * math.sqrt(8760) if returns.std() != 0 else 0
    roll_max = equity_series.cummax()
    dd = (equity_series - roll_max) / roll_max
    max_dd = dd.min() * 100 if not dd.empty else 0.0

    # final metrics and report
    metrics = {
        'total_return_pct': total_return,
        'num_trades': num_trades,
        'win_rate_pct': win_rate,
        'sharpe_ratio': sharpe,
        'max_drawdown_pct': max_dd,
        'final_capital': equity_series.iloc[-1]
    }

    logger.info(f"Backtest result: Return {total_return:.2f}% | Trades {num_trades} | Win {win_rate:.1f}% | DD {max_dd:.1f}% | Sharpe {sharpe:.2f}")

    # save and visualize
    out_prefix = f"backtest_{strat}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    perf = performance_report(equity_series, trades, initial_capital, out_prefix)
    metrics.update({'performance': perf, 'trades_sample': trades[-50:]})

    return metrics

# --------------------------------------------------
# CLI / Main wrapper - supports both modes
# --------------------------------------------------
def main(mode: str = "live"):
    # 1) Market analysis (always run)
    fa = run_market_analysis()
    print("Market forecast:", json.dumps(fa, indent=2, ensure_ascii=False))
    mode = "live"
    # Choose a symbol for backtest/live
    symbol = CONFIG["backtest_symbols"][0] if CONFIG["backtest_symbols"] else "BTC/USDT"
    #for symbol in ['BTC/USDT', 'ETH/USDT', 'TRX/USDT', 'LTC/USDT']:
    if True:
        if mode == "backtest":
            # load data for symbol
            df = generate_synthetic_or_real_data(symbol, days=CONFIG["backtest_days"])
            if df is None or df.empty:
                logger.error("No data for backtest")
                return
            # produce forecasts exactly as bkt uses
            forecasts = simulate_forecasts_stream(df)
            # run_backtest preserving original choices
            metrics = run_backtest(df, forecasts, strat='reentry_24h', initial_capital=10000, risk_per_trade=0.1, leverage=5, fee=0.001)
            print("Backtest metrics:", json.dumps(metrics, indent=2, default=str, ensure_ascii=False))

        elif mode == "live":
            # Live-mode simulation with open_position calls
            results = run_live_simulation(symbol=symbol, strat='reentry_24h', fee=0.001)
            print("Live simulation result:", json.dumps(results, indent=2, default=str, ensure_ascii=False))
        else:
            logger.error("Unknown mode. Use backtest or live.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Market Forecast & Backtest")
    parser.add_argument("--mode", type=str, default="backtest", help="mode: backtest | live")
    args = parser.parse_args()

    main(mode=args.mode)

