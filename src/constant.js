export const ALPACA_API_URL = {
  BROKER: "https://broker-api.sandbox.alpaca.markets",
  BROKER: "https://broker-api.alpaca.markets",
  MARKET: "https://data.sandbox.alpaca.markets",
  MARKET: "https://data.alpaca.markets",
  BASE_URL: "https://prospuh.io",
};
export const BASE_URL = "https://prospuh.io";
export const SUPPORTED_RESOLUTIONS_VALUES = {
  _1MINUTE: "1",
  _2MINUTE: "2",
  _15MINUTE: "15",
  _30MINUTE: "30",
  _1HOUR: "60",
  _2HOURS: "120",
  _3HOURS: "180",
  _4HOURS: "240",
  _1DAY: "1D",
  _1WEEK: "1W",
  _2WEEK: "2W",
  _1MONTH: "1M",
};

export const isSmallTimeFrame = (t) => ["1", "2", "15", "30", "60"].includes(t);
export const isLargeTimeFrame = (t) => ["1W", "2W", "1M"].includes(t);
export const TRADING_VIEW_RESOLUTION_TO_ALPACA = {
  [SUPPORTED_RESOLUTIONS_VALUES._1MINUTE]: "1min",
  [SUPPORTED_RESOLUTIONS_VALUES._2MINUTE]: "2min",
  [SUPPORTED_RESOLUTIONS_VALUES._15MINUTE]: "15min",
  [SUPPORTED_RESOLUTIONS_VALUES._30MINUTE]: "30min",
  [SUPPORTED_RESOLUTIONS_VALUES._1HOUR]: "1hour",
  [SUPPORTED_RESOLUTIONS_VALUES._2HOURS]: "2hour",
  [SUPPORTED_RESOLUTIONS_VALUES._3HOURS]: "3hour",
  [SUPPORTED_RESOLUTIONS_VALUES._4HOURS]: "4hour",
  [SUPPORTED_RESOLUTIONS_VALUES._1DAY]: "1day",
  [SUPPORTED_RESOLUTIONS_VALUES._1WEEK]: "1week",
  [SUPPORTED_RESOLUTIONS_VALUES._2WEEK]: "2week",
  [SUPPORTED_RESOLUTIONS_VALUES._1MONTH]: "1month",
};

export const DEFAULT_RESOLUTION = SUPPORTED_RESOLUTIONS_VALUES._1HOUR;
export const SUPPORTED_RESOLUTIONS = Object.values(
  SUPPORTED_RESOLUTIONS_VALUES
);

export const ChartTypes = {
  Bar: 0,
  Candle: 1,
  Line: 2,
  Area: 3,
  HeikinAshi: 8,
  HollowCandle: 9,
  Baseline: 10,
  HiLo: 12,
  Column: 13,
  LineWithMarkers: 14,
  Stepline: 15,
  HLCArea: 16,
};

export const isValidChartType = (chart) =>
  Object.values(ChartTypes).includes(chart);
