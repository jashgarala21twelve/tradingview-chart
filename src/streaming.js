import { isSmallTimeFrame } from "./constant.js";
import {
  parseFullSymbol,
  getNextMinuteBarTime,
  getNextBarTime,
  isSameDay,
  extractResolution,
  extractAndCombineResolution,
} from "./helpers.js";

// http://prospuh.io:2001
// http://localhost:5000
const socket = io("http://localhost:5000");
const channelToSubscription = new Map();

socket.on("connect", () => {
  console.log("[socket.io] Connected to server");
});
// socket.on("subscribe_trades", (data) => {
//   const { symbol, price: tP, timestamp } = data;
//   // console.log("data", data);

//   const date = new Date(timestamp).getTime();
//   // const unixTimeInSeconds = Math.floor(date / 1000);
//   // const tradeTime = unixTimeInSeconds;
//   const tradeTime = date;
//   const tradePrice = parseFloat(tP);
//   // const date = new Date(timestamp);
//   // const tradeTime = timestamp;
//   // console.log("tradeTime", tradeTime);

//   let subscriptionItem = channelToSubscription.get(symbol);
//   if (!subscriptionItem) return;
//   console.log("CCCCCCCCCC [stream]", subscriptionItem);
//   let currentTimeFrame = window.activeResolution;

//   const lastDailyBar = subscriptionItem?.lastBars[currentTimeFrame];
//   if (!lastDailyBar) return;

//   // console.log(
//   //   "[LASTBAR] - STREAM",
//   //   new Date(lastDailyBar.time).toTimeString(),
//   //   new Date(lastDailyBar.time).toDateString()
//   // );
//   const nextDailyBarTime = getNextBarTime(lastDailyBar?.time, currentTimeFrame);
//   // console.log("nextDailyBarTime", nextDailyBarTime);
//   // console.log(
//   //   "lastDailyBar nextDailyBarTime tradeTime",
//   //   lastDailyBar?.time,
//   //   nextDailyBarTime,
//   //   tradeTime
//   // );

//   // console.log({
//   //   subscriptionItem,
//   //   tradeTime,
//   //   tradeTimeReadable: formatTime(tradeTime),
//   //   lastDailyBarTime: lastDailyBar?.time,
//   //   lastDailyBarTimeReadable: lastDailyBar
//   //     ? formatTime(lastDailyBar?.time)
//   //     : "N/A",
//   //   nextDailyBarTime,
//   //   nextMinuteBarTimeReadable: formatTime(nextDailyBarTime),
//   // });
//   let bar;

//   // console.log(tradeTime >= nextDailyBarTime, "IsNewBar");

//   console.table([
//     {
//       Label: "Trade Time",
//       Time: new Date(tradeTime).toTimeString(),
//       Date: new Date(tradeTime).toDateString(),
//     },
//     {
//       Label: "Last Daily Bar Time",
//       Time: new Date(lastDailyBar.time).toTimeString(),
//       Date: new Date(lastDailyBar.time).toDateString(),
//     },
//     {
//       Label: "Next Daily Bar Time",
//       Time: new Date(nextDailyBarTime).toTimeString(),
//       Date: new Date(nextDailyBarTime).toDateString(),
//     },
//   ]);
//   // console.log(isSmallTimeFrame(currentTimeFrame), "isSmallTimeFrame");
//   // if (isSmallTimeFrame(currentTimeFrame)) {
//   //   console.log(
//   //     isSameDay(new Date(lastDailyBar.time), new Date(tradeTime)),
//   //     "isSameDay"
//   //   );
//   //   if (!isSameDay(new Date(lastDailyBar.time), new Date(tradeTime))) {
//   //     return;
//   //   }
//   // }

//   if (tradeTime >= nextDailyBarTime) {
//     bar = {
//       time: nextDailyBarTime,
//       open: tradePrice,
//       high: tradePrice,
//       low: tradePrice,
//       close: tradePrice,
//     };
//     console.log(
//       "[socket.io] Generate new bar",
//       bar,
//       new Date(bar.time).toDateString(),
//       new Date(bar.time).toTimeString()
//     );
//   } else {
//     bar = {
//       ...lastDailyBar,
//       high: Math.max(lastDailyBar.high, tradePrice),
//       low: Math.min(lastDailyBar.low, tradePrice),
//       close: tradePrice,
//     };
//     console.log(
//       "[socket.io] Update the latest bar by price",
//       bar,
//       new Date(bar.time).toDateString(),
//       new Date(bar.time).toTimeString()
//     );
//   }

//   subscriptionItem.lastBars[currentTimeFrame] = bar;

//   // //   // Send data to every subscriber of that symbol
//   subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
//   // console.log("SUBBBBBBBBBBBBBBBBB", subscriptionItem);

//   // if (bar.time === lastDailyBar.time) {
//   //   subscriptionItem.handlers.forEach((handler) => handler.callback(bar)); // Update the most recent bar
//   //   subscriptionItem.lastDailyBar = bar; // Update the last bar in the subscription
//   // } else if (bar.time > lastDailyBar.time) {
//   //   subscriptionItem.handlers.forEach((handler) => handler.callback(bar)); // Add a new bar
//   // } else {
//   //   subscriptionItem.handlers.forEach((handler) =>
//   //     handler.onResetCacheNeededCallback()
//   //   ); // Trigger a cache reset
//   // }
// });

socket.on("subscribe_trades", (data) => {
  const { symbol, price: tP, timestamp } = data;
  const tradeTime = new Date(timestamp).getTime();
  const tradePrice = parseFloat(tP);
  console.log("Trade Data Received:", { symbol, tradePrice, tradeTime });
  let subscriptionItem = channelToSubscription.get(symbol);
  if (!subscriptionItem) {
    console.warn("No subscription item found for symbol:", symbol);
    return;
  }
  let currentTimeFrame = window.activeResolution;
  if (!currentTimeFrame) {
    console.error("Active resolution not set.");
    return;
  }
  const lastDailyBar = subscriptionItem?.lastBars[currentTimeFrame];
  if (!lastDailyBar) {
    console.warn("No last bar found for current timeframe:", currentTimeFrame);
    return;
  }

  const nextDailyBarTime = getNextBarTime(lastDailyBar.time, currentTimeFrame);
  console.log(
    "Calculated next bar time:",
    new Date(nextDailyBarTime).toISOString()
  );
  let bar;
  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
    };
    console.log(
      "[socket.io] Generate new bar",
      bar,
      new Date(bar.time).toDateString(),
      new Date(bar.time).toTimeString()
    );
  } else {
    bar = {
      ...lastDailyBar,
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice,
    };
    console.log(
      "[socket.io] Update the latest bar by price",
      bar,
      new Date(bar.time).toDateString(),
      new Date(bar.time).toTimeString()
    );
  }

  // Ensure subscriptionItem.lastBars exists
  if (!subscriptionItem.lastBars) {
    subscriptionItem.lastBars = {};
  }

  subscriptionItem.lastBars[currentTimeFrame] = bar;
  console.log(
    "Updated last bars for timeframe:",
    currentTimeFrame,
    subscriptionItem.lastBars
  );
  const subscriptionIdToUpdate = extractAndCombineResolution(
    subscriptionItem.subscriberUID,
    currentTimeFrame
  );
  console.log(subscriptionItem, "subscriptionItem");
  console.log(subscriptionIdToUpdate, "subscriptionIdToUpdate");
  // subscriptionItem.handlers.forEach((handler) => {
  //   console.log("handler", handler);
  //   console.log("Calling handler for bar update:", bar);
  //   handler.callback(bar);
  // });
  // console.log(
  //   "extractResolution(currentTimeFrame)",
  //   extractResolution(currentTimeFrame)
  // );
  subscriptionItem.handlers
    .filter((handler) => handler.id === subscriptionIdToUpdate)
    .forEach((handler) => {
      console.log("Calling handler for bar update:", bar);
      handler.callback(bar);
    });
});

socket.on("disconnect", (reason) => {
  console.log("[socket.io] Disconnected:", reason);
});

socket.on("error", (error) => {
  console.log("[socket.io] Error:", error);
});

socket.on("message", (data) => {
  console.log("[socket.io] Message:", data);
  const {
    TYPE: eventTypeStr,
    M: exchange,
    FSYM: fromSymbol,
    TSYM: toSymbol,
    TS: tradeTimeStr,
    P: tradePriceStr,
  } = data;

  if (parseInt(eventTypeStr) !== 0) {
    // Skip all non-trading events
    return;
  }

  const tradePrice = parseFloat(tradePriceStr);
  const tradeTime = parseInt(tradeTimeStr);
  const channelString = `0~${exchange}~${fromSymbol}~${toSymbol}`;
  const subscriptionItem = channelToSubscription.get(channelString);

  if (subscriptionItem === undefined) {
    return;
  }

  const lastDailyBar = subscriptionItem.lastDailyBar;
  const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time);

  let bar;

  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
    };
    console.log("[socket.io] Generate new bar", bar);
  } else {
    bar = {
      ...lastDailyBar,
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice,
    };
    console.log("[socket.io] Update the latest bar by price", tradePrice);
  }

  subscriptionItem.lastDailyBar = bar;

  //   // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
});
// function getNextDailyBarTime(barTime) {
//   const date = new Date(barTime);
//   date.setDate(date.getDate() + 1);

//   return date.getTime();
// }

// function getNextDailyBarTime(barTime) {
//   const date = new Date(barTime * 1000);
//   date.setDate(date.getDate() + 1);
//   return date.getTime() / 1000;
// }

export function subscribeOnStream(
  symbolInfo,
  resolution,
  onRealtimeCallback,
  subscriberUID,
  onResetCacheNeededCallback,
  lastDailyBar
) {
  console.log("symbolInfopoooo", symbolInfo);
  // console.log("LASSSSSSTTT", lastDailyBar);
  // console.log(
  //   "[LASTBAR]-SUBSCRIBE INSIDE",
  //   new Date(lastDailyBar.time).toTimeString(),
  //   new Date(lastDailyBar.time).toDateString()
  // );

  // const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
  const channelString = `${symbolInfo.name}`;
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
    onResetCacheNeededCallback: onResetCacheNeededCallback,
  };
  let subscriptionItem = channelToSubscription.get(channelString);
  // console.log("CCCCCCCCCC [subscribe] BEFORE SET", subscriptionItem);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.resolution = resolution;
    subscriptionItem.subscriberUID = subscriberUID;
    subscriptionItem.lastBars = {
      ...subscriptionItem?.lastBars,
      [resolution]: lastDailyBar,
    };
    const existingHandlerIndex = subscriptionItem.handlers.findIndex(
      (h) => h.id === subscriberUID
    );
    if (existingHandlerIndex === -1) {
      subscriptionItem.handlers.push(handler);
    } else {
      subscriptionItem.handlers[existingHandlerIndex] = handler;
    }
    // channelToSubscription.set(channelString, subscriptionItem);
    // console.log("CCCCCCCCCC [subscribe] AFTER SET", subscriptionItem);
    console.log("subscriptionItem", subscriptionItem, lastDailyBar);
    return;
  }
  subscriptionItem = {
    name: symbolInfo.name,
    exchange: symbolInfo.exchange,
    full_name: symbolInfo.full_name,
    subscriberUID,
    resolution,
    lastBars: {
      [resolution]: lastDailyBar,
    },
    handlers: [handler],
  };
  console.log("subscriptionItem", subscriptionItem, lastDailyBar);
  channelToSubscription.set(channelString, subscriptionItem);
  console.log(
    "[subscribeBars]: Subscribe to streaming. Channel:",
    channelString
  );
  socket.emit("subscribe", { type: "trades", symbol: symbolInfo.name });
  // socket.emit("subscribe", { type: "bars", symbol: symbolInfo.name });
}

export function unsubscribeFromStream(subscriberUID) {
  // Find a subscription with id === subscriberUID
  console.log("subscriptionItemmmmm", subscriberUID);
  for (const channelString of channelToSubscription.keys()) {
    console.log("channelString", channelString);
    const subscriptionItem = channelToSubscription.get(channelString);
    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler) => handler.id === subscriberUID
    );
    console.log(subscriptionItem, "subscriptionItemmmmm Before");
    if (handlerIndex !== -1) {
      // Remove from handlers
      subscriptionItem.handlers.splice(handlerIndex, 1);
      console.log(subscriptionItem, "subscriptionItemmmmm After");
      if (subscriptionItem.handlers.length === 0) {
        // Unsubscribe from the channel if it was the last handler
        console.log(
          "[unsubscribeBars]: Unsubscribe from streaming. Channel:",
          channelString
        );
        // const subRequest = {
        //   action: "SubRemove",
        //   subs: [channelString],
        // };
        // socket.send(JSON.stringify(subRequest));
        socket.emit("unsubscribe", {
          type: "trades",
          symbol: subscriptionItem.name,
        });
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}
