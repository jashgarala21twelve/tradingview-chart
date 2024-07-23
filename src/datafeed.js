import {
  ALPACA_API_URL,
  ALPACA_AUTH_TOKEN,
  SUPPORTED_RESOLUTIONS,
  TRADING_VIEW_RESOLUTION_TO_ALPACA,
} from "./constant.js";
import {
  makeApiRequest,
  generateSymbol,
  makeAlpacaBrokerApiRequest,
  getLatestEndDateForGraph,
  getLatestBar,
} from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const lastBarsCache = new Map();

// DatafeedConfiguration implementation
const configurationData = {
  // Represents the resolutions for bars supported by your datafeed
  supported_resolutions: [...SUPPORTED_RESOLUTIONS],
  supports_search: false,
  // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
  exchanges: [
    {
      value: "NASDAQ",
      name: "NASDAQ",
      desc: "NASDAQ",
    },
    {
      value: "OTC",
      name: "OTC",
      desc: "OTC",
    },
    {
      value: "crypto",
      name: "crypto",
      desc: "crypto",
    },
  ],
  // The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
  symbols_types: [
    {
      name: "us_equity",
      value: "us_equity",
    },
  ],
};

// Obtains all symbols for all exchanges supported by CryptoCompare API
async function getAllSymbols() {
  const data = await makeApiRequest("data/v3/all/exchanges");
  let allSymbols = [];

  for (const exchange of configurationData.exchanges) {
    const pairs = data.Data[exchange.value].pairs;

    for (const leftPairPart of Object.keys(pairs)) {
      const symbols = pairs[leftPairPart].map((rightPairPart) => {
        const symbol = generateSymbol(
          exchange.value,
          leftPairPart,
          rightPairPart
        );
        return {
          symbol: symbol.short,
          full_name: symbol.full,
          description: symbol.short,
          exchange: exchange.value,
          type: "crypto",
        };
      });
      allSymbols = [...allSymbols, ...symbols];
    }
  }
  return allSymbols;
}

async function getAllSymbolsAlpaca() {
  const data = await makeAlpacaBrokerApiRequest(
    "get",
    "assets?asset_class=us_equity&status=active"
  );
  // console.log("ALPACA ALL ASSETS", data);

  // for (const exchange of configurationData.exchanges) {
  //   const pairs = data.Data[exchange.value].pairs;

  //   for (const leftPairPart of Object.keys(pairs)) {
  //     const symbols = pairs[leftPairPart].map((rightPairPart) => {
  //       const symbol = generateSymbol(
  //         exchange.value,
  //         leftPairPart,
  //         rightPairPart
  //       );
  //       return {
  //         symbol: symbol.short,
  //         full_name: symbol.full,
  //         description: symbol.short,
  //         exchange: exchange.value,
  //         type: "crypto",
  //       };
  //     });
  //     allSymbols = [...allSymbols, ...symbols];
  //   }
  // }
  let allSymbols = data.map((originalObject) => {
    return {
      symbol: originalObject.symbol,
      full_name: `${originalObject.exchange}:${originalObject.symbol}`,
      description: originalObject.symbol,
      exchange: originalObject.exchange,
      type: originalObject.class,
    };
  });
  return allSymbols;
}

// let isNextPageToken = true;
let isNextPageToken = true;
export default {
  onReady: (callback) => {
    console.log("[onReady]: Method call");
    setTimeout(() => callback(configurationData));
  },

  searchSymbols: async (
    userInput,
    exchange,
    symbolType,
    onResultReadyCallback
  ) => {
    console.log("[searchSymbols]: Method call");
    const symbols = await getAllSymbolsAlpaca();
    const newSymbols = symbols.filter((symbol) => {
      const isExchangeValid = exchange === "" || symbol.exchange === exchange;
      const isFullSymbolContainsInput =
        symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
      return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
  },

  resolveSymbol: async (
    symbol,
    onSymbolResolvedCallback,
    onResolveErrorCallback,
    extension
  ) => {
    console.log("[resolveSymbol]: Method call", symbol);
    const symbols = await getAllSymbolsAlpaca();
    const symbolItem = symbols.find(({ full_name }) => full_name === symbol);
    console.log("symbolItem", symbolItem);
    if (!symbolItem) {
      console.log("[resolveSymbol]: Cannot resolve symbol", symbol);
      onResolveErrorCallback("cannot resolve symbol");
      return;
    }
    // Symbol information object
    const symbolInfo = {
      ticker: symbolItem.full_name,
      name: symbolItem.symbol,
      description: symbolItem.description,
      type: symbolItem.type,
      session: "0930-1600", // Regular market hours
      timezone: "America/New_York",
      // session: "24x7",
      // timezone: "Etc/UTC",
      // session: "0915-1530", // Indian market hours
      // timezone: "Asia/Kolkata",
      exchange: symbolItem.exchange,
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      // has_no_volume: true,
      has_weekly_and_monthly: true,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 2,
      data_status: "streaming",
    };

    console.log("[resolveSymbol]: Symbol resolved", symbol);
    // console.log("[symbolInfo]: Symbol symbolInfo", symbolInfo);
    onSymbolResolvedCallback(symbolInfo);
  },

  getBars: async (
    symbolInfo,
    resolution,
    periodParams,
    onHistoryCallback,
    onErrorCallback
  ) => {
    const { from, to, firstDataRequest, countBack } = periodParams;
    console.log(
      "[getBars]: Method call",
      symbolInfo,
      resolution,
      from,
      to,
      countBack
    );
    let allBars = [];
    let nextPageToken = null;
    // const start = "2024-01-01T00:00:00Z";
    const start = "2024-07-01T00:00:00Z";
    const end = getLatestEndDateForGraph();
    // const end = getLatestEndDate();

    const fetchBars = async (pageToken = null) => {
      const timeframe = TRADING_VIEW_RESOLUTION_TO_ALPACA[resolution];
      const encodedSymbol = encodeURIComponent(symbolInfo.name);
      const MARKET_URL = ALPACA_API_URL.MARKET;
      let API_URL = `${MARKET_URL}/v2/stocks/${encodedSymbol}/bars?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;
      if (!isNextPageToken && !firstDataRequest) {
        isNextPageToken = true;
        onHistoryCallback([], { noData: true });
      }
      if (pageToken) {
        API_URL += `&page_token=${pageToken}`;
      }

      try {
        const response = await fetch(API_URL, {
          headers: {
            Authorization: ALPACA_AUTH_TOKEN,
          },
        });
        const data = await response.json();

        if (!response.ok || !data.bars || data.bars.length === 0) {
          onHistoryCallback([], { noData: true });
          return;
        }

        const bars = data.bars.map((bar) => ({
          time: new Date(bar.t).getTime(),
          low: bar.l,
          high: bar.h,
          open: bar.o,
          close: bar.c,
          volume: bar.v, // Add volume if available
        }));
        bars.sort((a, b) => a.time - b.time);
        // console.log(bars, "bars");
        allBars = allBars.concat(bars);
        console.log("[Bars length]:", allBars.length);
        nextPageToken = data.next_page_token;

        if (nextPageToken) {
          isNextPageToken = true;
          // Fetch next page of data
          await fetchBars(nextPageToken);
        } else {
          if (firstDataRequest) {
            const latestBarData = await getLatestBar(symbolInfo.name);
            const latestBar = latestBarData?.bar;
            lastBarsCache.set(symbolInfo.name, {
              ...allBars[allBars.length - 1],
              low: latestBar.l,
              high: latestBar.h,
              open: latestBar.o,
              close: latestBar.c,
              volume: latestBar.v, // Add volume if available
              // time: new Date().getTime(),
            });
          }
          isNextPageToken = false;
          // console.log("bars", allBars);
          onHistoryCallback(allBars, { noData: false });
        }
      } catch (error) {
        console.log("error", error.message);
        console.log("[getBars]: Get error", error);
        onErrorCallback(error);
      }
    };

    await fetchBars();
  },
  // getBars: async (
  //   symbolInfo,
  //   resolution,
  //   periodParams,
  //   onHistoryCallback,
  //   onErrorCallback
  // ) => {
  //   const { from, to, firstDataRequest, countBack } = periodParams;
  //   console.log(
  //     "[getBars]: Method call",
  //     symbolInfo,
  //     resolution,
  //     from,
  //     to,
  //     countBack
  //   );
  //   const fromDate = new Date(from * 1000);
  //   const toDate = new Date(to * 1000);

  //   // Convert to readable format
  //   const start = fromDate.toISOString();
  //   let end;
  //   if (firstDataRequest) {
  //     end = "2024-07-20T14:48:00Z";
  //   } else {
  //     end = toDate.toISOString();
  //   }

  //   console.log("start", start);
  //   console.log("end", end);

  //   let allBars = [];
  //   let nextPageToken = null;
  //   // const start = "2024-01-01T00:00:00Z";
  //   // const start = "2024-06-01T00:00:00Z";
  //   // const end = "2024-07-20T14:48:00Z";
  //   // const end = getLatestEndDate();

  //   const fetchBars = async (pageToken = null) => {
  //     const timeframe = TRADING_VIEW_RESOLUTION_TO_ALPACA[resolution];
  //     const encodedSymbol = encodeURIComponent(symbolInfo.name);
  //     const MARKET_URL = ALPACA_API_URL.MARKET;
  //     let API_URL = `${MARKET_URL}/v2/stocks/${encodedSymbol}/bars?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;

  //     try {
  //       const response = await fetch(API_URL, {
  //         headers: {
  //           Authorization: ALPACA_AUTH_TOKEN,
  //         },
  //       });
  //       const data = await response.json();

  //       if (!response.ok || !data.bars || data.bars.length === 0) {
  //         onHistoryCallback([], {
  //           noData: true,
  //         });
  //         return;
  //       }

  //       const bars = data.bars.map((bar) => ({
  //         time: new Date(bar.t).getTime(),
  //         low: bar.l,
  //         high: bar.h,
  //         open: bar.o,
  //         close: bar.c,
  //         volume: bar.v, // Add volume if available
  //       }));
  //       onHistoryCallback(bars, {
  //         noData: false,
  //       });
  //       if (firstDataRequest) {
  //         lastBarsCache.set(symbolInfo.name, {
  //           ...bars[bars.length - 1],
  //           time: new Date().getTime(),
  //         });
  //       }
  //       console.log("[Bars length]:", allBars.length);
  //     } catch (error) {
  //       console.log("error", error.message);
  //       console.log("[getBars]: Get error", error);
  //       onErrorCallback(error);
  //     }
  //   };

  //   await fetchBars();
  // },

  subscribeBars: (
    symbolInfo,
    resolution,
    onRealtimeCallback,
    subscriberUID,
    onResetCacheNeededCallback
  ) => {
    console.log(
      "[subscribeBars]: Method call with subscriberUID:",
      subscriberUID
    );
    console.log(lastBarsCache.get(symbolInfo.name), "lastBar");
    subscribeOnStream(
      symbolInfo,
      resolution,
      onRealtimeCallback,
      subscriberUID,
      onResetCacheNeededCallback,
      lastBarsCache.get(symbolInfo.name)
    );
  },

  unsubscribeBars: (subscriberUID) => {
    console.log(
      "[unsubscribeBars]: Method call with subscriberUID:",
      subscriberUID
    );
    // unsubscribeFromStream(subscriberUID);
  },
};
