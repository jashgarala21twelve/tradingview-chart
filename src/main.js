// Datafeed implementation
import Datafeed from "./datafeed.js";

window.tvWidget = new TradingView.widget({
  symbol: "NASDAQ:AAPL", // Default symbol
  interval: "1", // Default interval
  fullscreen: true, // Displays the chart in the fullscreen mode
  container: "tv_chart_container", // Reference to an attribute of the DOM element
  datafeed: Datafeed,

  library_path: "../charting_library/",
  disabled_features: ["header_symbol_search", "symbol_search_hot_key"],
  // Optional: Disabling other features
});

window.tvWidget.onChartReady(function () {
  // Custom script to set interval if needed
  window.tvWidget.chart().setResolution("1");
});
