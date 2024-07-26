// export const ALPACA_API_URL = {
//   // BROKER: "https://broker-api.sandbox.alpaca.markets",
//   // BROKER: "https://broker-api.alpaca.markets",
//   // MARKET: "https://data.sandbox.alpaca.markets",
//   // MARKET: "https://data.alpaca.markets",
//   BASE_URL: "https://prospuh.io",
// };
export const BASE_URL = "https://prospuh.io";

export const SUPPORTED_RESOLUTIONS_VALUES = {
  _1MINUTE: "1",
  _2MINUTE: "2",
  _15MINUTE: "15",
  _30MINUTE: "30",
  _60MINUTE: "60",
  _6HOURS: "360",
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
  [SUPPORTED_RESOLUTIONS_VALUES._60MINUTE]: "1hour",
  [SUPPORTED_RESOLUTIONS_VALUES._6HOURS]: "6hour",
  [SUPPORTED_RESOLUTIONS_VALUES._1DAY]: "1day",
  [SUPPORTED_RESOLUTIONS_VALUES._1WEEK]: "1week",
  [SUPPORTED_RESOLUTIONS_VALUES._2WEEK]: "2week",
  [SUPPORTED_RESOLUTIONS_VALUES._1MONTH]: "1month",
};

export const DEFAULT_RESOLUTION = SUPPORTED_RESOLUTIONS_VALUES._1MINUTE;
export const SUPPORTED_RESOLUTIONS = Object.values(
  SUPPORTED_RESOLUTIONS_VALUES
);
