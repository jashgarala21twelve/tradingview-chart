import { ALPACA_API_URL, ALPACA_AUTH_TOKEN } from "./constant.js";
import {
  makeApiRequest,
  generateSymbol,
  parseFullSymbol,
  makeAlpacaBrokerApiRequest,
  makeAlpacaMarketApiRequest,
  fetchAllHistoricalAlpacaData,
  getResolution,
} from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const lastBarsCache = new Map();

// DatafeedConfiguration implementation
const configurationData = {
  // Represents the resolutions for bars supported by your datafeed
  supported_resolutions: ["1", "15", "30", "60", "6H", "1D", "1W", "2W", "1M"],
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
      session: "24x7",
      timezone: "Etc/UTC",
      exchange: symbolItem.exchange,
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      has_no_volume: true,
      has_weekly_and_monthly: true,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 2,
      data_status: "streaming",
    };

    console.log("[resolveSymbol]: Symbol resolved", symbol);
    // console.log("[symbolInfo]: Symbol symbolInfo", symbolInfo);
    onSymbolResolvedCallback(symbolInfo);
  },

  /**
   * 
   * @param {*} symbolInfo 
   * @param {*} resolution 
   * @param {*} periodParams 
   * @param {*} onHistoryCallback 
   * @param {*} onErrorCallback 

  getBars: async (
    symbolInfo,
    resolution,
    periodParams,
    onHistoryCallback,
    onErrorCallback
  ) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log("[getBars]: Method call", symbolInfo, resolution, from, to);
    // const parsedSymbol = parseFullSymbol(symbolInfo.full_name);

    // const urlParameters = {
    //   e: parsedSymbol.exchange,
    //   fsym: parsedSymbol.fromSymbol,
    //   tsym: parsedSymbol.toSymbol,
    //   toTs: to,
    //   limit: 2000,
    // };
    // const query = Object.keys(urlParameters)
    //   .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
    //   .join("&");
    try {
      // const data = await makeApiRequest(`data/histoday?${query}`);
      // const start = new Date(from * 1000).toISOString();
      // const end = new Date(to * 1000).toISOString();

      const start = "2023-01-01T00:00:00Z";
      const end = "2023-12-31T00:00:00Z";
      const timeframe = "6hour";
      const API_URL = `stocks/${symbolInfo.name}/bars?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;
      const data = await fetchAllHistoricalAlpacaData(API_URL);
      const bars = data.map((bar) => {
        return {
          time: new Date(bar.t).getTime(),
          low: bar.l,
          high: bar.h,
          open: bar.o,
          close: bar.c,
        };
      });
      console.log("bars", bars);
      // console.log("firstDataRequest", firstDataRequest);
      if (firstDataRequest) {
        lastBarsCache.set(symbolInfo.name, {
          ...bars[bars.length - 1],
        });
      }

      // console.log(`[getBars]: returned ${bars.length} bar(s)`);
      // console.log("Bars", bars);
      // if (firstDataRequest) {
      //   lastBarsCache.set(symbolInfo.full_name, {
      //     ...bars[bars.length - 1],
      //   });
      // }
      // console.log("data.length",data.length)
      // onHistoryCallback(bars);
      if (data.length < 1) {
        onHistoryCallback([], { noData: true });
      } else {
        onHistoryCallback(bars, { noData: false });
      }

      // if (
      //   (data.Response && data.Response === "Error") ||
      //   data.Data.length === 0
      // ) {
      //   // "noData" should be set if there is no data in the requested period
      //   onHistoryCallback([], {
      //     noData: true,
      //   });
      //   return;
      // }
      // let bars = [];
      // data.Data.forEach((bar) => {
      //   if (bar.time >= from && bar.time < to) {
      //     b`ars = [
      //       ...bars,
      //       {
      //         time: bar.time * 1000,
      //         low: bar.low,
      //         high: bar.high,
      //         open: bar.open,
      //         close: bar.close,
      //       },
      //     ];
      //   }
      // });
      // if (firstDataRequest) {
      //   lastBarsCache.set(symbolInfo.full_name, {
      //     ...bars[bars.length - 1],
      //   });
      // }
      // console.log(`[getBars]: returned ${bars.length} bar(s)`);
      // // console.log("Bars", bars);
      // onHistoryCallback(bars, {
      //   noData: false,
      // });
    } catch (error) {
      console.log("[getBars]: Get error", error);
      onErrorCallback(error);
    }
  },
   */
  getBars: async (
    symbolInfo,
    resolution,
    periodParams,
    onHistoryCallback,
    onErrorCallback
  ) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log("[getBars]: Method call", symbolInfo, resolution, from, to);
    let allBars = [];
    let nextPageToken = null;
    const start = "2024-01-01T00:00:00Z";
    const end = "2024-07-18T12:53:30Z";
    const fetchBars = async (pageToken = null) => {
      const timeframe = getResolution(resolution);
      // console.log("timeframe", timeframe);
      // console.log("isNextPageToken", isNextPageToken);
      // console.log("pageToken", pageToken);
      console.log("symbolInfo.name", symbolInfo.name);
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
        console.log(bars, "bars");
        allBars = allBars.concat(bars);
        console.log("[Bars length]:", allBars.length);
        nextPageToken = data.next_page_token;

        if (nextPageToken) {
          isNextPageToken = true;
          // Fetch next page of data
          await fetchBars(nextPageToken);
        } else {
          if (firstDataRequest) {
            lastBarsCache.set(symbolInfo.name, {
              ...allBars[allBars.length - 1],
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
