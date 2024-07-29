import {
  BASE_URL,
  isLargeTimeFrame,
  SUPPORTED_RESOLUTIONS,
  TRADING_VIEW_RESOLUTION_TO_ALPACA,
} from "./constant.js";
import {
  generateSymbol,
  getLatestEndDateForGraph,
  getLatestBar,
  generateStaticBars,
  getAllAssets,
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
    // {
    //   value: "NASDAQ",
    //   name: "NASDAQ",
    //   desc: "NASDAQ",
    // },
    // {
    //   value: "OTC",
    //   name: "OTC",
    //   desc: "OTC",
    // },
    // {
    //   value: "crypto",
    //   name: "crypto",
    //   desc: "crypto",
    // },
  ],
  // The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
  symbols_types: [
    // {
    //   name: "us_equity",
    //   value: "us_equity",
    // },
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
  const data = await getAllAssets();
  let allSymbols = data?.map((originalObject) => {
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
      // session: "0930-1600", // Regular market hours
      // timezone: "America/New_York",
      session: "24x7",
      timezone: "Etc/UTC",
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
    onSymbolResolvedCallback(symbolInfo);
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
  //   let allBars = [];
  //   let nextPageToken = null;

  //   const date = new Date();
  //   date.setMonth(date.getMonth() - 6);
  //   const start = date.toISOString();
  //   const end = getLatestEndDateForGraph();
  //   // const end = getLatestEndDate();

  //   const fetchBars = async (pageToken = null) => {
  //     const timeframe = TRADING_VIEW_RESOLUTION_TO_ALPACA[resolution];
  //     const encodedSymbol = encodeURIComponent(symbolInfo.name);
  //     // const MARKET_URL = ALPACA_API_URL.MARKET;
  //     // let API_URL = `${MARKET_URL}/v2/stocks/${encodedSymbol}/bars?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;
  //     let API_URL = `${BASE_URL}/api/position/bars/${encodedSymbol}?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;
  //     if (!isNextPageToken && !firstDataRequest) {
  //       isNextPageToken = true;
  //       onHistoryCallback([], { noData: true });
  //     }
  //     if (pageToken) {
  //       API_URL += `&page_token=${pageToken}`;
  //     }

  //     try {
  //       const response = await fetch(API_URL, {});
  //       const { data } = await response.json();

  //       if (!response.ok || !data.bars || data.bars.length === 0) {
  //         onHistoryCallback([], { noData: true });
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
  //       bars.sort((a, b) => a.time - b.time);
  //       // console.log(bars, "bars");
  //       allBars = allBars.concat(bars);
  //       console.log("[Bars length]:", allBars.length);
  //       nextPageToken = data.next_page_token;

  //       if (nextPageToken) {
  //         isNextPageToken = true;
  //         // Fetch next page of data
  //         await fetchBars(nextPageToken);
  //       } else {
  //         if (firstDataRequest) {
  //           // window.isSocketOn = false;
  //           // const latestBarData = await getLatestBar(symbolInfo.name);
  //           // const latestBar = latestBarData?.bar;
  //           lastBarsCache.set(symbolInfo.name, {
  //             ...lastBarsCache.get(symbolInfo.name),
  //             [resolution]: {
  //               ...allBars[allBars.length - 1],
  //             },
  //           });
  //         }
  //         isNextPageToken = false;
  //         // console.log("bars", allBars);
  //         onHistoryCallback(allBars, { noData: false });
  //       }
  //     } catch (error) {
  //       console.log("error", error.message);
  //       console.log("[getBars]: Get error", error);
  //       onErrorCallback(error);
  //     }
  //   };

  //   await fetchBars();
  // },

  ////////////STATIC BARS///////////////
  // getBars: async (
  //   symbolInfo,
  //   resolution,
  //   periodParams,
  //   onHistoryCallback,
  //   onErrorCallback
  // ) => {
  //   let allBars = [];
  //   const { from, to, firstDataRequest, countBack } = periodParams;
  //   console.log(
  //     "[getBars]: Method call",
  //     symbolInfo,
  //     resolution,
  //     from,
  //     to,
  //     countBack,
  //     firstDataRequest
  //   );

  //   if (!firstDataRequest) {
  //     onHistoryCallback([], { noData: true });
  //   }

  //   let fromDate = new Date(from * 1000).toISOString().split("T")[0];
  //   let toDate = new Date(to * 1000).toISOString().split("T")[0];

  //   let start = fromDate;
  //   let end = toDate;
  //   // if (firstDataRequest) {
  //   //   let latestEndDate = new Date(getLatestEndDateForGraph()).toISOString();
  //   //   end = latestEndDate;
  //   // } else {
  //   //   end = toDate;
  //   // }

  //   console.log("[start end]", { start, end });

  //   // Generate static bars based on resolution
  //   const staticBars = generateStaticBars(resolution, count);

  //   console.log("generateStaticBars", staticBars);

  //   // Return static bars as the data
  //   if (staticBars.length === 0) {
  //     onHistoryCallback([], { noData: true });
  //   } else {
  //     const date = new Date();
  //     allBars = staticBars;
  //     let d = {
  //       ...allBars[allBars.length - 1],
  //     };
  //     // if (resolution === "2") {
  //     //   d = {
  //     //     ...d,
  //     //     time: date.getTime(),
  //     //   };
  //     //   consol
  //     // }
  //     lastBarsCache.set(symbolInfo?.name, d);
  //     console.log("allBars", allBars);
  //     console.log(
  //       "[LASTBAR]-getBars",
  //       new Date(d.time).toTimeString(),
  //       new Date(d.time).toDateString()
  //     );
  //     onHistoryCallback(allBars, { noData: false });
  //   }
  //   count += 1;
  //   console.log("symbolInfosymbolInfo", symbolInfo);
  //   // if (firstDataRequest) {
  //   //   lastBarsCache.set(symbolInfo?.name, {
  //   //     ...allBars[allBars.length - 1],
  //   //   });
  //   // }
  //   console.log("firstDataRequest", firstDataRequest);
  //   console.log("allBarssss", allBars);
  //   console.log(lastBarsCache, "lllll");
  // },
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
      countBack,
      firstDataRequest
    );
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);

    // Convert to readable format
    const start = fromDate.toISOString();
    let end;
    if (firstDataRequest) {
      end = getLatestEndDateForGraph();
    } else {
      end = toDate.toISOString();
    }

    // console.log("start", start);
    // console.log("end", end);
    // console.log("START END", start, end);
    let allBars = [];
    let nextPageToken = null;
    // const start = "2024-01-01T00:00:00Z";
    // const start = "2024-06-01T00:00:00Z";
    // const end = "2024-07-20T14:48:00Z";
    // const end = getLatestEndDate();

    const fetchBars = async (start, end) => {
      const timeframe = TRADING_VIEW_RESOLUTION_TO_ALPACA[resolution];
      const encodedSymbol = encodeURIComponent(symbolInfo.name);
      // const MARKET_URL = ALPACA_API_URL.MARKET;
      // let API_URL = `${MARKET_URL}/v2/stocks/${encodedSymbol}/bars?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;
      let API_URL = `${BASE_URL}/api/position/bars/${encodedSymbol}?start=${start}&end=${end}&timeframe=${timeframe}&limit=1000`;
      try {
        const response = await fetch(API_URL, {});
        const { data, status } = await response.json();
        if (status === 0) {
          await fetchBars(start, end);
          return;
        }
        if (isLargeTimeFrame(resolution)) {
          if (data.next_page_token == null && !firstDataRequest) {
            onHistoryCallback([], {
              noData: true,
            });
            return;
          }
        } else {
          if (!response.ok || !data.bars || data.bars.length === 0) {
            end = start;
            const date = new Date(start);
            date.setDate(date.getDate() - 1);

            await fetchBars(date.toISOString(), end);
            // onHistoryCallback([], {
            //   noData: true,
            // });
            return;
          }
        }

        const bars = data.bars.map((bar) => ({
          time: new Date(bar.t).getTime(),
          low: bar.l,
          high: bar.h,
          open: bar.o,
          close: bar.c,
          volume: bar.v, // Add volume if available
        }));
        console.log("firstDataRequest", firstDataRequest);

        if (firstDataRequest) {
          lastBarsCache.set(symbolInfo.name, {
            ...bars[bars.length - 1],
            time: new Date().getTime(),
          });

          // lastBarsCache.set(symbolInfo.name, {
          //   [resolution]: {
          //     ...bars[bars.length - 1],
          //     time: new Date().getTime(),
          //   },
          // });
          // console.log(lastBarsCache, "AAAA");
        }
        onHistoryCallback(bars, {
          noData: false,
        });
        // console.log("[Bars length]:", bars.length);
      } catch (error) {
        console.log("error", error.message);
        console.log("[getBars]: Get error", error);
        onErrorCallback(error);
      }
    };

    await fetchBars(start, end);
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
    // console.log("subscribebars", typeof symbolInfo.name);
    // console.log(lastBarsCache, "lastBar");
    // console.log(
    //   "[LASTBAR]-subscribeBarsFunction",
    //   new Date(lastBarsCache.get(symbolInfo.name).time).toTimeString(),
    //   new Date(lastBarsCache.get(symbolInfo.name).time).toDateString()
    // );
    // console.log("LASTBAR", lastBarsCache.get(symbolInfo.name));
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
