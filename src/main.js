// Datafeed implementation
import { DEFAULT_RESOLUTION } from "./constant.js";
import Datafeed from "./datafeed.js";
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    symbol: params.get("symbol") || "NASDAQ:AAPL",
    theme: params.get("theme") || "light",
    interval: params.get("interval") || DEFAULT_RESOLUTION,
  };
}
const { symbol, theme, interval } = getUrlParams();
window.tvWidget = new TradingView.widget({
  symbol: symbol, // Default symbol
  interval: interval, // Default interval
  fullscreen: true, // Displays the chart in the fullscreen mode
  container: "tv_chart_container", // Reference to an attribute of the DOM element
  datafeed: Datafeed,
  library_path: "../charting_library/charting_library.js",
  disabled_features: ["header_symbol_search", "symbol_search_hot_key"],
  overrides: {
    "mainSeriesProperties.showCountdown": true, // Show countdown
  },
  theme: theme,
  // debug: true,
});

window.tvWidget.onChartReady(function () {
  window.tvWidget.chart().setResolution(interval);
});
