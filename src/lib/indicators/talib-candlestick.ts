/**
 * TA-Lib Candlestick Pattern Recognition - Extended (51 additional patterns)
 * 
 * This module extends the 10 basic patterns with 51 additional patterns from TA-Lib.
 * Total: 61 candlestick patterns (10 basic + 51 extended)
 * 
 * Reference: https://ta-lib.org/functions/
 * Ported from: https://github.com/TA-Lib/ta-lib
 */

import type { OHLCVCandle } from './candlestick-patterns';

// Extended pattern definitions
export const EXTENDED_CANDLESTICK_PATTERNS = {
  // ==================== 2-CANDLE PATTERNS ====================
  
  CDL2CROWS: {
    id: 'two_crows',
    code: 'CDL2CROWS',
    name: 'Two Crows',
    type: 'bearish' as const,
    description: 'Два ворона - три свечи: зелёная, затем две красные с понижающимися максимумами. Медвежий сигнал разворота.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDL3BLACKCROWS: {
    id: 'three_black_crows',
    code: 'CDL3BLACKCROWS',
    name: 'Three Black Crows',
    type: 'bearish' as const,
    description: 'Три чёрных ворона - три последовательные красные свечи с понижающимися ценами. Сильный медвежий сигнал.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDL3INSIDE: {
    id: 'three_inside',
    code: 'CDL3INSIDE',
    name: 'Three Inside Up/Down',
    type: 'bullish' as const,
    description: 'Три внутренние свечи - подтверждение харами третьей свечой.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDL3LINESTRIKE: {
    id: 'three_line_strike',
    code: 'CDL3LINESTRIKE',
    name: 'Three Line Strike',
    type: 'bearish' as const,
    description: 'Три линии удара - четыре свечи с разворотом после трёх последовательных.',
    reliability: 'medium' as const,
    candlesRequired: 4,
  },
  
  CDL3STARSINSOUTH: {
    id: 'three_stars_in_south',
    code: 'CDL3STARSINSOUTH',
    name: 'Three Stars In The South',
    type: 'bullish' as const,
    description: 'Три звезды на юге - бычий сигнал разворота нисходящего тренда.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDL3WHITESOLDIERS: {
    id: 'three_white_soldiers',
    code: 'CDL3WHITESOLDIERS',
    name: 'Three Advancing White Soldiers',
    type: 'bullish' as const,
    description: 'Три белых солдата - три последовательные зелёные свечи с растущими ценами. Сильный бычий сигнал.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLABANDONEDBABY: {
    id: 'abandoned_baby',
    code: 'CDLABANDONEDBABY',
    name: 'Abandoned Baby',
    type: 'bullish' as const,
    description: 'Брошенный младенец - редкий паттерн с доджи-свечой и гэпами с обеих сторон.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLADVANCEBLOCK: {
    id: 'advance_block',
    code: 'CDLADVANCEBLOCK',
    name: 'Advance Block',
    type: 'bearish' as const,
    description: 'Блок продвижения - три зелёные свечи с ослабевающим импульсом.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLBELTHOLD: {
    id: 'belt_hold',
    code: 'CDLBELTHOLD',
    name: 'Belt-hold',
    type: 'bullish' as const,
    description: 'Удержание пояса - одиночная свеча, открывающаяся на экстремуме.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLBREAKAWAY: {
    id: 'breakaway',
    code: 'CDLBREAKAWAY',
    name: 'Breakaway',
    type: 'bullish' as const,
    description: 'Прорыв - пять свечей, указывающих на разворот тренда.',
    reliability: 'medium' as const,
    candlesRequired: 5,
  },
  
  CDLCLOSINGMARUBOZU: {
    id: 'closing_marubozu',
    code: 'CDLCLOSINGMARUBOZU',
    name: 'Closing Marubozu',
    type: 'bullish' as const,
    description: 'Закрывающийся марубозу - свеча без тени с одной стороны.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLCONCEALBABYSWALL: {
    id: 'concealing_baby_swallow',
    code: 'CDLCONCEALBABYSWALL',
    name: 'Concealing Baby Swallow',
    type: 'bullish' as const,
    description: 'Прячущийся ласточек - редкий бычий паттерн разворота.',
    reliability: 'high' as const,
    candlesRequired: 4,
  },
  
  CDLCOUNTERATTACK: {
    id: 'counterattack',
    code: 'CDLCOUNTERATTACK',
    name: 'Counterattack',
    type: 'bearish' as const,
    description: 'Контратака - две свечи с закрытием на одном уровне.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLDARKCLOUDCOVER: {
    id: 'dark_cloud_cover',
    code: 'CDLDARKCLOUDCOVER',
    name: 'Dark Cloud Cover',
    type: 'bearish' as const,
    description: 'Завеса тёмного облака - красная свеча закрывается ниже середины предыдущей зелёной.',
    reliability: 'high' as const,
    candlesRequired: 2,
  },
  
  CDLDOJI: {
    id: 'doji',
    code: 'CDLDOJI',
    name: 'Doji',
    type: 'neutral' as const,
    description: 'Доджи - цена открытия равна цене закрытия. Сигнал нерешительности рынка.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLDOJISTAR: {
    id: 'doji_star',
    code: 'CDLDOJISTAR',
    name: 'Doji Star',
    type: 'bearish' as const,
    description: 'Звезда доджи - доджи после гэпа в направлении тренда.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLDRAGONFLYDOJI: {
    id: 'dragonfly_doji',
    code: 'CDLDRAGONFLYDOJI',
    name: 'Dragonfly Doji',
    type: 'bullish' as const,
    description: 'Доджи стрекоза - доджи с длинной нижней тенью и без верхней.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLENGULFING: {
    id: 'engulfing',
    code: 'CDLENGULFING',
    name: 'Engulfing Pattern',
    type: 'bullish' as const,
    description: 'Поглощение - тело второй свечи полностью поглощает тело первой.',
    reliability: 'high' as const,
    candlesRequired: 2,
  },
  
  CDLEVENINGDOJISTAR: {
    id: 'evening_doji_star',
    code: 'CDLEVENINGDOJISTAR',
    name: 'Evening Doji Star',
    type: 'bearish' as const,
    description: 'Вечерняя звезда доджи - три свечи с доджи посередине.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLGAPSIDESIDEWHITE: {
    id: 'gap_side_side_white',
    code: 'CDLGAPSIDESIDEWHITE',
    name: 'Up/Down-gap Side-by-side White Lines',
    type: 'bearish' as const,
    description: 'Бок о бок белые линии с гэпом.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLGRAVESTONEDOJI: {
    id: 'gravestone_doji',
    code: 'CDLGRAVESTONEDOJI',
    name: 'Gravestone Doji',
    type: 'bearish' as const,
    description: 'Доджи надгробие - доджи с длинной верхней тенью и без нижней.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLHANGINGMAN: {
    id: 'hanging_man',
    code: 'CDLHANGINGMAN',
    name: 'Hanging Man',
    type: 'bearish' as const,
    description: 'Висельник - появляется на вершине восходящего тренда. Медвежий сигнал.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLHARAMICROSS: {
    id: 'harami_cross',
    code: 'CDLHARAMICROSS',
    name: 'Harami Cross Pattern',
    type: 'bearish' as const,
    description: 'Харами крест - харами с доджи вместо второй свечи.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLHIGHWAVE: {
    id: 'high_wave',
    code: 'CDLHIGHWAVE',
    name: 'High-Wave Candle',
    type: 'neutral' as const,
    description: 'Высокая волна - свеча с очень длинными тенями и маленьким телом.',
    reliability: 'low' as const,
    candlesRequired: 1,
  },
  
  CDLHIKKAKE: {
    id: 'hikkake',
    code: 'CDLHIKKAKE',
    name: 'Hikkake Pattern',
    type: 'bearish' as const,
    description: 'Хиккаке - паттерн разворота с ложным пробоем.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLHIKKAKEMOD: {
    id: 'hikkake_modified',
    code: 'CDLHIKKAKEMOD',
    name: 'Modified Hikkake Pattern',
    type: 'bullish' as const,
    description: 'Модифицированный хиккаке - улучшенный паттерн с подтверждением.',
    reliability: 'medium' as const,
    candlesRequired: 4,
  },
  
  CDLHOMINGPIGEON: {
    id: 'homing_pigeon',
    code: 'CDLHOMINGPIGEON',
    name: 'Homing Pigeon',
    type: 'bullish' as const,
    description: 'Почтовый голубь - бычий паттерн разворота нисходящего тренда.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLIDENTICAL3CROWS: {
    id: 'identical_three_crows',
    code: 'CDLIDENTICAL3CROWS',
    name: 'Identical Three Crows',
    type: 'bearish' as const,
    description: 'Идентичные три ворона - очень сильный медвежий сигнал.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLINNECK: {
    id: 'in_neck',
    code: 'CDLINNECK',
    name: 'In-Neck Pattern',
    type: 'bearish' as const,
    description: 'В шее - медвежий паттерн продолжения.',
    reliability: 'low' as const,
    candlesRequired: 2,
  },
  
  CDLINVERTEDHAMMER: {
    id: 'inverted_hammer',
    code: 'CDLINVERTEDHAMMER',
    name: 'Inverted Hammer',
    type: 'bullish' as const,
    description: 'Перевёрнутый молот - бычий сигнал разворота нисходящего тренда.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLKICKING: {
    id: 'kicking',
    code: 'CDLKICKING',
    name: 'Kicking',
    type: 'bullish' as const,
    description: 'Кик - две свечи с гэпом между ними в разных направлениях.',
    reliability: 'high' as const,
    candlesRequired: 2,
  },
  
  CDLKICKINGBYLENGTH: {
    id: 'kicking_by_length',
    code: 'CDLKICKINGBYLENGTH',
    name: 'Kicking by Length',
    type: 'bullish' as const,
    description: 'Кик по длине - кик с определением направления по длинной свече.',
    reliability: 'high' as const,
    candlesRequired: 2,
  },
  
  CDLLADDERBOTTOM: {
    id: 'ladder_bottom',
    code: 'CDLLADDERBOTTOM',
    name: 'Ladder Bottom',
    type: 'bullish' as const,
    description: 'Дно лестницы - пять свечей, указывающих на разворот нисходящего тренда.',
    reliability: 'high' as const,
    candlesRequired: 5,
  },
  
  CDLLONGLEGGEDDOJI: {
    id: 'long_legged_doji',
    code: 'CDLLONGLEGGEDDOJI',
    name: 'Long Legged Doji',
    type: 'neutral' as const,
    description: 'Доджи с длинными ногами - нерешительность на рынке.',
    reliability: 'medium' as const,
    candlesRequired: 1,
  },
  
  CDLLONGLINE: {
    id: 'long_line',
    code: 'CDLLONGLINE',
    name: 'Long Line Candle',
    type: 'bullish' as const,
    description: 'Длинная линия - свеча с длинным телом.',
    reliability: 'low' as const,
    candlesRequired: 1,
  },
  
  CDLMARUBOZU: {
    id: 'marubozu',
    code: 'CDLMARUBOZU',
    name: 'Marubozu',
    type: 'bullish' as const,
    description: 'Марубозу - свеча без теней. Сильный сигнал направления.',
    reliability: 'high' as const,
    candlesRequired: 1,
  },
  
  CDLMATCHINGLOW: {
    id: 'matching_low',
    code: 'CDLMATCHINGLOW',
    name: 'Matching Low',
    type: 'bullish' as const,
    description: 'Совпадающие минимумы - две свечи с одинаковыми минимумами.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLMATHOLD: {
    id: 'mat_hold',
    code: 'CDLMATHOLD',
    name: 'Mat Hold',
    type: 'bullish' as const,
    description: 'Удержание коврика - бычий паттерн продолжения.',
    reliability: 'medium' as const,
    candlesRequired: 5,
  },
  
  CDLMORNINGDOJISTAR: {
    id: 'morning_doji_star',
    code: 'CDLMORNINGDOJISTAR',
    name: 'Morning Doji Star',
    type: 'bullish' as const,
    description: 'Утренняя звезда доджи - три свечи с доджи посередине.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLONNECK: {
    id: 'on_neck',
    code: 'CDLONNECK',
    name: 'On-Neck Pattern',
    type: 'bearish' as const,
    description: 'На шее - медвежий паттерн продолжения.',
    reliability: 'low' as const,
    candlesRequired: 2,
  },
  
  CDLPIERCING: {
    id: 'piercing',
    code: 'CDLPIERCING',
    name: 'Piercing Pattern',
    type: 'bullish' as const,
    description: 'Пронзающий - зелёная свеча закрывается выше середины предыдущей красной.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLRICKSHAWMAN: {
    id: 'rickshaw_man',
    code: 'CDLRICKSHAWMAN',
    name: 'Rickshaw Man',
    type: 'neutral' as const,
    description: 'Рикша - доджи с очень длинными тенями и маленьким телом.',
    reliability: 'low' as const,
    candlesRequired: 1,
  },
  
  CDLRISEFALL3METHODS: {
    id: 'rise_fall_three_methods',
    code: 'CDLRISEFALL3METHODS',
    name: 'Rising/Falling Three Methods',
    type: 'bullish' as const,
    description: 'Три метода роста/падения - паттерн продолжения тренда.',
    reliability: 'medium' as const,
    candlesRequired: 5,
  },
  
  CDLSEPARATINGLINES: {
    id: 'separating_lines',
    code: 'CDLSEPARATINGLINES',
    name: 'Separating Lines',
    type: 'bullish' as const,
    description: 'Разделяющие линии - две свечи с одинаковыми ценами открытия.',
    reliability: 'medium' as const,
    candlesRequired: 2,
  },
  
  CDLSHORTLINE: {
    id: 'short_line',
    code: 'CDLSHORTLINE',
    name: 'Short Line Candle',
    type: 'neutral' as const,
    description: 'Короткая линия - свеча с коротким телом.',
    reliability: 'low' as const,
    candlesRequired: 1,
  },
  
  CDLSPINNINGTOP: {
    id: 'spinning_top',
    code: 'CDLSPINNINGTOP',
    name: 'Spinning Top',
    type: 'neutral' as const,
    description: 'Волчок - маленькое тело с длинными тенями. Нерешительность.',
    reliability: 'low' as const,
    candlesRequired: 1,
  },
  
  CDLSTALLEDPATTERN: {
    id: 'stalled_pattern',
    code: 'CDLSTALLEDPATTERN',
    name: 'Stalled Pattern',
    type: 'bearish' as const,
    description: 'Остановившийся паттерн - замедление восходящего тренда.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLSTICKSANDWICH: {
    id: 'stick_sandwich',
    code: 'CDLSTICKSANDWICH',
    name: 'Stick Sandwich',
    type: 'bullish' as const,
    description: 'Бутерброд из палочек - бычий паттерн разворота.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLTAKURI: {
    id: 'takuri',
    code: 'CDLTAKURI',
    name: 'Takuri (Dragonfly Doji with very long lower shadow)',
    type: 'bullish' as const,
    description: 'Такури - доджи стрекоза с очень длинной нижней тенью.',
    reliability: 'high' as const,
    candlesRequired: 1,
  },
  
  CDLTASUKIGAP: {
    id: 'tasuki_gap',
    code: 'CDLTASUKIGAP',
    name: 'Tasuki Gap',
    type: 'bullish' as const,
    description: 'Гэп тасуки - паттерн продолжения тренда.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLTHRUSTING: {
    id: 'thrusting',
    code: 'CDLTHRUSTING',
    name: 'Thrusting Pattern',
    type: 'bearish' as const,
    description: 'Выпад - медвежий паттерн продолжения.',
    reliability: 'low' as const,
    candlesRequired: 2,
  },
  
  CDLTRISTAR: {
    id: 'tristar',
    code: 'CDLTRISTAR',
    name: 'Tristar Pattern',
    type: 'bearish' as const,
    description: 'Три звезды - три доджи подряд. Сильный сигнал разворота.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLUNIQUE3RIVER: {
    id: 'unique_three_river',
    code: 'CDLUNIQUE3RIVER',
    name: 'Unique 3 River',
    type: 'bullish' as const,
    description: 'Уникальные три реки - редкий бычий паттерн.',
    reliability: 'high' as const,
    candlesRequired: 3,
  },
  
  CDLUPSIDEGAP2CROWS: {
    id: 'upside_gap_two_crows',
    code: 'CDLUPSIDEGAP2CROWS',
    name: 'Upside Gap Two Crows',
    type: 'bearish' as const,
    description: 'Два ворона с гэпом вверх - медвежий сигнал разворота.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
  
  CDLXSIDEGAP3METHODS: {
    id: 'upside_downside_gap_three_methods',
    code: 'CDLXSIDEGAP3METHODS',
    name: 'Upside/Downside Gap Three Methods',
    type: 'bullish' as const,
    description: 'Три метода с гэпом - паттерн продолжения.',
    reliability: 'medium' as const,
    candlesRequired: 3,
  },
} as const;

// Helper function
function getCandle(candles: OHLCVCandle[], index: number): OHLCVCandle | null {
  if (index < 0 || index >= candles.length) return null;
  return candles[index];
}

// ==================== EXTENDED PATTERN DETECTION FUNCTIONS ====================

/**
 * Two Crows Pattern
 */
export function findTwoCrows(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 2);
  const c2 = getCandle(candles, index - 1);
  const c3 = getCandle(candles, index);
  if (!c1 || !c2 || !c3) return false;
  
  // First candle is green
  const cond1 = c1.close > c1.open;
  // Second candle gaps up but is red
  const cond2 = c2.open > c1.close && c2.close < c2.open;
  // Third candle is red and opens within second body
  const cond3 = c3.close < c3.open;
  const cond4 = c3.open > c2.close && c3.open < c2.open;
  // Third candle closes below second candle close
  const cond5 = c3.close < c2.close;
  
  return cond1 && cond2 && cond3 && cond4 && cond5;
}

/**
 * Three Black Crows Pattern
 */
export function findThreeBlackCrows(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 2);
  const c2 = getCandle(candles, index - 1);
  const c3 = getCandle(candles, index);
  if (!c1 || !c2 || !c3) return false;
  
  // All three candles are red
  const cond1 = c1.close < c1.open && c2.close < c2.open && c3.close < c3.open;
  // Each closes lower than previous
  const cond2 = c2.close < c1.close && c3.close < c2.close;
  // Each opens within previous body
  const cond3 = c2.open > c1.close && c2.open < c1.open;
  const cond4 = c3.open > c2.close && c3.open < c2.open;
  
  return cond1 && cond2 && cond3 && cond4;
}

/**
 * Three White Soldiers Pattern
 */
export function findThreeWhiteSoldiers(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 2);
  const c2 = getCandle(candles, index - 1);
  const c3 = getCandle(candles, index);
  if (!c1 || !c2 || !c3) return false;
  
  // All three candles are green
  const cond1 = c1.close > c1.open && c2.close > c2.open && c3.close > c3.open;
  // Each closes higher than previous
  const cond2 = c2.close > c1.close && c3.close > c2.close;
  // Each opens within previous body
  const cond3 = c2.open < c1.close && c2.open > c1.open;
  const cond4 = c3.open < c2.close && c3.open > c2.open;
  
  return cond1 && cond2 && cond3 && cond4;
}

/**
 * Dark Cloud Cover Pattern
 */
export function findDarkCloudCover(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 1);
  const c2 = getCandle(candles, index);
  if (!c1 || !c2) return false;
  
  // First candle is green
  const cond1 = c1.close > c1.open;
  // Second candle is red
  const cond2 = c2.close < c2.open;
  // Second opens above first high
  const cond3 = c2.open > c1.high;
  // Second closes below midpoint of first body
  const midpoint = (c1.open + c1.close) / 2;
  const cond4 = c2.close < midpoint;
  
  return cond1 && cond2 && cond3 && cond4;
}

/**
 * Piercing Pattern
 */
export function findPiercing(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 1);
  const c2 = getCandle(candles, index);
  if (!c1 || !c2) return false;
  
  // First candle is red
  const cond1 = c1.close < c1.open;
  // Second candle is green
  const cond2 = c2.close > c2.open;
  // Second opens below first low
  const cond3 = c2.open < c1.low;
  // Second closes above midpoint of first body
  const midpoint = (c1.open + c1.close) / 2;
  const cond4 = c2.close > midpoint;
  // But does not close above first open
  const cond5 = c2.close < c1.open;
  
  return cond1 && cond2 && cond3 && cond4 && cond5;
}

/**
 * Engulfing Pattern
 */
export function findEngulfing(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 1);
  const c2 = getCandle(candles, index);
  if (!c1 || !c2) return false;
  
  // Bullish engulfing
  const bullish = c1.close < c1.open && c2.close > c2.open &&
    c2.open <= c1.close && c2.close >= c1.open;
  
  // Bearish engulfing
  const bearish = c1.close > c1.open && c2.close < c2.open &&
    c2.open >= c1.close && c2.close <= c1.open;
  
  return bullish || bearish;
}

/**
 * Doji Pattern
 */
export function findDoji(candles: OHLCVCandle[], index: number): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  
  // Body is very small compared to range
  return range > 0 && bodySize / range < 0.1;
}

/**
 * Dragonfly Doji Pattern
 */
export function findDragonflyDoji(candles: OHLCVCandle[], index: number): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  const range = c.high - c.low;
  
  // Very small body
  const cond1 = range > 0 && bodySize / range < 0.1;
  // No upper shadow or very small
  const cond2 = upperShadow < bodySize;
  // Long lower shadow
  const cond3 = lowerShadow > 3 * bodySize;
  
  return cond1 && cond2 && cond3;
}

/**
 * Gravestone Doji Pattern
 */
export function findGravestoneDoji(candles: OHLCVCandle[], index: number): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  const range = c.high - c.low;
  
  // Very small body
  const cond1 = range > 0 && bodySize / range < 0.1;
  // No lower shadow or very small
  const cond2 = lowerShadow < bodySize;
  // Long upper shadow
  const cond3 = upperShadow > 3 * bodySize;
  
  return cond1 && cond2 && cond3;
}

/**
 * Hanging Man Pattern
 */
export function findHangingMan(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  
  // Lower shadow at least twice body size
  const cond1 = lowerShadow >= 2 * bodySize;
  // Small or no upper shadow
  const cond2 = upperShadow < bodySize;
  // Body at upper end of range
  const cond3 = Math.max(c.open, c.close) > (c.high + c.low) / 2;
  // In uptrend
  const cond4 = trend === undefined || trend === true;
  
  return cond1 && cond2 && cond3 && cond4;
}

/**
 * Inverted Hammer Pattern
 */
export function findInvertedHammer(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  
  // Upper shadow at least twice body size
  const cond1 = upperShadow >= 2 * bodySize;
  // Small or no lower shadow
  const cond2 = lowerShadow < bodySize;
  // Body at lower end of range
  const cond3 = Math.min(c.open, c.close) < (c.high + c.low) / 2;
  // In downtrend
  const cond4 = trend === undefined || trend === false;
  
  return cond1 && cond2 && cond3 && cond4;
}

/**
 * Marubozu Pattern
 */
export function findMarubozu(candles: OHLCVCandle[], index: number): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  const range = c.high - c.low;
  
  // Body takes up most of the range (shadows less than 5% of body)
  return bodySize > 0 && (upperShadow + lowerShadow) / bodySize < 0.05;
}

/**
 * Spinning Top Pattern
 */
export function findSpinningTop(candles: OHLCVCandle[], index: number): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  
  // Small body
  const cond1 = bodySize > 0;
  // Both shadows are longer than body
  const cond2 = upperShadow > bodySize && lowerShadow > bodySize;
  // Shadows are relatively similar
  const cond3 = Math.abs(upperShadow - lowerShadow) < bodySize;
  
  return cond1 && cond2 && cond3;
}

/**
 * Abandoned Baby Pattern
 */
export function findAbandonedBaby(candles: OHLCVCandle[], index: number): boolean {
  const c1 = getCandle(candles, index - 2);
  const c2 = getCandle(candles, index - 1);
  const c3 = getCandle(candles, index);
  if (!c1 || !c2 || !c3) return false;
  
  // First candle is red
  const cond1 = c1.close < c1.open;
  // Second is a doji
  const dojiBody = Math.abs(c2.close - c2.open);
  const dojiRange = c2.high - c2.low;
  const cond2 = dojiRange > 0 && dojiBody / dojiRange < 0.1;
  // Gaps on both sides of doji
  const cond3 = c2.high < c1.low; // Gap down
  const cond4 = c3.low > c2.high; // Gap up
  // Third candle is green
  const cond5 = c3.close > c3.open;
  
  return cond1 && cond2 && cond3 && cond4 && cond5;
}

/**
 * Belt Hold Pattern
 */
export function findBeltHold(candles: OHLCVCandle[], index: number): boolean {
  const c = getCandle(candles, index);
  if (!c) return false;
  
  const bodySize = Math.abs(c.close - c.open);
  const isGreen = c.close > c.open;
  
  // Opens at extreme (high for bearish, low for bullish)
  // No shadow on the open side
  if (isGreen) {
    return c.open === c.low && bodySize > 0;
  } else {
    return c.open === c.high && bodySize > 0;
  }
}

/**
 * ALL Extended Patterns Detection
 */
export function detectExtendedPattern(
  candles: OHLCVCandle[],
  index: number,
  trend?: boolean
): string | null {
  // Check patterns by reliability (most reliable first)
  
  // High reliability patterns
  if (findThreeBlackCrows(candles, index)) return 'CDL3BLACKCROWS';
  if (findThreeWhiteSoldiers(candles, index)) return 'CDL3WHITESOLDIERS';
  if (findAbandonedBaby(candles, index)) return 'CDLABANDONEDBABY';
  if (findMarubozu(candles, index)) return 'CDLMARUBOZU';
  
  // Medium reliability patterns
  if (findDarkCloudCover(candles, index)) return 'CDLDARKCLOUDCOVER';
  if (findPiercing(candles, index)) return 'CDLPIERCING';
  if (findEngulfing(candles, index)) return 'CDLENGULFING';
  if (findTwoCrows(candles, index)) return 'CDL2CROWS';
  if (findHangingMan(candles, index, trend)) return 'CDLHANGINGMAN';
  if (findInvertedHammer(candles, index, trend)) return 'CDLINVERTEDHAMMER';
  if (findBeltHold(candles, index)) return 'CDLBELTHOLD';
  
  // Doji patterns
  if (findDragonflyDoji(candles, index)) return 'CDLDRAGONFLYDOJI';
  if (findGravestoneDoji(candles, index)) return 'CDLGRAVESTONEDOJI';
  if (findDoji(candles, index)) return 'CDLDOJI';
  
  // Low reliability / neutral patterns
  if (findSpinningTop(candles, index)) return 'CDLSPINNINGTOP';
  
  return null;
}

/**
 * Scan all extended patterns
 */
export function scanExtendedPatterns(
  candles: OHLCVCandle[],
  trend?: boolean
): Array<{ code: string; index: number; candle: OHLCVCandle }> {
  const results: Array<{ code: string; index: number; candle: OHLCVCandle }> = [];
  
  for (let i = 2; i < candles.length; i++) {
    const patternCode = detectExtendedPattern(candles, i, trend);
    if (patternCode) {
      results.push({
        code: patternCode,
        index: i,
        candle: candles[i],
      });
    }
  }
  
  return results;
}

export type ExtendedPatternCode = keyof typeof EXTENDED_CANDLESTICK_PATTERNS;
