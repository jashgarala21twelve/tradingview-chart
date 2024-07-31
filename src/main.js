// Datafeed implementation
import {
  ChartTypes,
  DEFAULT_RESOLUTION,
  isValidChartType,
} from "./constant.js";
import Datafeed from "./datafeed.js";
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    symbol: params.get("symbol") || "NASDAQ:AAPL",
    theme: params.get("theme") || "light",
    interval: params.get("interval") || DEFAULT_RESOLUTION,
    chart_type: params.get("chart_type") || ChartTypes.Candle,
  };
}

const { symbol, theme, interval, chart_type } = getUrlParams();

let chartType = +chart_type;
chartType = !isValidChartType(chartType) ? ChartTypes.Candle : chartType;
const isAreaChart = +chartType === ChartTypes.Area;

/// Disable Features ////
let disabledFeatures = [
  // "header_resolutions",
  "symbol_search_hot_key",
  "use_localstorage_for_settings",
  "header_symbol_search",
  "legend_widget",
  "header_compare",
];
let disabledFeaturesInAreaChart = ["left_toolbar", "header_widget"];
disabledFeatures = isAreaChart
  ? [...disabledFeatures, ...disabledFeaturesInAreaChart]
  : disabledFeatures;

/// Disable Features  End ////

window.tvWidget = new TradingView.widget({
  symbol: symbol, // Default symbol
  interval: interval, // Default interval
  fullscreen: true, // Displays the chart in the fullscreen mode
  container: "tv_chart_container", // Reference to an attribute of the DOM element
  datafeed: Datafeed,
  library_path: "../charting_library/",
  disabled_features: disabledFeatures,
  overrides: {
    "mainSeriesProperties.showCountdown": true, // Show countdown
    "mainSeriesProperties.style": chartType, // Setting the default chart type to candlestick
  },

  theme: theme,
  timezone: "America/New_York", // Set the default timezone
  // debug: true,
});

window.activeResolution = DEFAULT_RESOLUTION;
window.tvWidget.onChartReady(function () {
  window.tvWidget.chart().setResolution(interval);
  window.tvWidget
    .activeChart()
    .onIntervalChanged()
    .subscribe(null, (interval, timeframeObj) => {
      window.activeResolution = interval;
    });
});
