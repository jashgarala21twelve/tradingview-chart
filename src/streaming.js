import { ALPACA_API_KEY, ALPACA_SECRET_KEY } from "./constant.js";
import {
  parseFullSymbol,
  apiKey,
  getNextMinuteBarTime,
  getNextBarTime,
} from "./helpers.js";

// const socket = new WebSocket(
//   "ws://127.0.0.1:5229/a1d81405-ccb3-46d3-8f0c-ce2281864c9c"
// );

// const channelToSubscription = new Map();
// const SYMBOL = "AAPL";
// socket.addEventListener("open", () => {
//   // const authMessage = {
//   //   action: "auth",
//   //   key: ALPACA_API_KEY,
//   //   secret: ALPACA_SECRET_KEY,
//   // };
//   // socket.send(JSON.stringify({}));
//   // socket.send(JSON.stringify(authMessage));
//   // const subscribeMessage = {
//   //   action: "subscribe",
//   //   trades: [SYMBOL],
//   // };
// });

// socket.addEventListener("close", (reason) => {
//   console.log("[socket] Disconnected:", reason);
// });

// socket.addEventListener("error", (error) => {
//   console.log("[socket] Error:", error);
// });

// socket.addEventListener("message", (event) => {
//   const data = JSON.parse(event.data);
//   console.log("[socket] Message:", data);
//   const {
//     TYPE: eventTypeStr,
//     M: exchange,
//     FSYM: fromSymbol,
//     TSYM: toSymbol,
//     TS: tradeTimeStr,
//     P: tradePriceStr,
//   } = data;

//   if (parseInt(eventTypeStr) !== 0) {
//     // Skip all non-trading events
//     return;
//   }
//   const tradePrice = parseFloat(tradePriceStr);
//   const tradeTime = parseInt(tradeTimeStr);
//   const channelString = `0~${exchange}~${fromSymbol}~${toSymbol}`;
//   const subscriptionItem = channelToSubscription.get(channelString);
//   if (subscriptionItem === undefined) {
//     return;
//   }
//   const lastDailyBar = subscriptionItem.lastDailyBar;
//   const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time);

//   let bar;
//   if (tradeTime >= nextDailyBarTime) {
//     bar = {
//       time: nextDailyBarTime,
//       open: tradePrice,
//       high: tradePrice,
//       low: tradePrice,
//       close: tradePrice,
//     };
//     console.log("[socket] Generate new bar", bar);
//   } else {
//     bar = {
//       ...lastDailyBar,
//       high: Math.max(lastDailyBar.high, tradePrice),
//       low: Math.min(lastDailyBar.low, tradePrice),
//       close: tradePrice,
//     };
//     console.log("[socket] Update the latest bar by price", tradePrice);
//   }
//   subscriptionItem.lastDailyBar = bar;

//   // Send data to every subscriber of that symbol
//   subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
// });
// http://prospuh.io:2001

const socket = io("http://prospuh.io:2001");
const channelToSubscription = new Map();

socket.on("connect", () => {
  console.log("[socket.io] Connected to server");
  socket.emit("subscribe", { type: "trades", symbol: "AAPL" });
});
socket.on("subscribe_trades", (data) => {
  // console.log("[subscribe_daily_bars] data", data);
  // subscribe_trades
  const { symbol, price: tP, timestamp } = data;
  console.log("data", data);
  const date = new Date(timestamp).getTime();
  // const unixTimeInSeconds = Math.floor(date / 1000);
  // const tradeTime = unixTimeInSeconds;
  const tradeTime = date;
  const tradePrice = parseFloat(tP);
  // const date = new Date(timestamp);
  // const tradeTime = timestamp;
  // console.log("tradeTime", tradeTime);
  let subscriptionItem = channelToSubscription.get(symbol);

  let currentTimeFrame = subscriptionItem?.resolution;
  console.log("currentTimeFrame", currentTimeFrame);
  const lastDailyBar = subscriptionItem?.lastDailyBar;
  const nextDailyBarTime = getNextBarTime(lastDailyBar?.time, currentTimeFrame);
  console.log(
    "lastDailyBar nextDailyBarTime tradeTime",
    lastDailyBar?.time,
    nextDailyBarTime,
    tradeTime
  );
  console.log("lastDailyBar nextDailyBarTime", lastDailyBar > nextDailyBarTime);
  const formatTime = (timeInMs) => new Date(timeInMs).toISOString();

  console.log({
    subscriptionItem,
    tradeTime,
    tradeTimeReadable: formatTime(tradeTime),
    lastDailyBarTime: lastDailyBar?.time,
    lastDailyBarTimeReadable: lastDailyBar
      ? formatTime(lastDailyBar?.time)
      : "N/A",
    nextDailyBarTime,
    nextMinuteBarTimeReadable: formatTime(nextDailyBarTime),
  });
  let bar;
  console.log(tradeTime >= nextDailyBarTime, "IsNewBar");
  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
    };
    console.log("[socket.io] Generate new bar", bar.time, lastDailyBar?.time);
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
  console.log("lastBar", lastDailyBar);
  console.log({
    symbolInfo,
    resolution,
    onRealtimeCallback,
    subscriberUID,
    onResetCacheNeededCallback,
    lastDailyBar,
  });
  // const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
  const channelString = `${symbolInfo.name}`;
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
  };
  let subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.resolution = resolution;
    subscriptionItem.handlers.push(handler);
    return;
  }
  console.log("lastDailyBarrr", lastDailyBar);
  subscriptionItem = {
    subscriberUID,
    resolution,
    lastDailyBar,
    handlers: [handler],
  };
  channelToSubscription.set(channelString, subscriptionItem);
  console.log(
    "[subscribeBars]: Subscribe to streaming. Channel:",
    channelString
  );
  socket.emit("subscribe", { type: "trades", symbol: symbolInfo.name });
  // socket.emit("subscribe", { type: "bars", symbol: symbolInfo.name });

  // const subRequest = {
  //   action: "SubAdd",
  //   subs: [channelString],
  // };
  // socket.send(JSON.stringify(subRequest));

  ////////////
  // const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
  // const channelString = `0~${parsedSymbol.exchange}~${parsedSymbol.fromSymbol}~${parsedSymbol.toSymbol}`;
  // const handler = {
  //   id: subscriberUID,
  //   callback: onRealtimeCallback,
  // };
  // let subscriptionItem = channelToSubscription.get(channelString);
  // if (subscriptionItem) {
  //   // Already subscribed to the channel, use the existing subscription
  //   subscriptionItem.handlers.push(handler);
  //   return;
  // }
  // subscriptionItem = {
  //   subscriberUID,
  //   resolution,
  //   lastDailyBar,
  //   handlers: [handler],
  // };
  // channelToSubscription.set(channelString, subscriptionItem);
  // console.log(
  //   "[subscribeBars]: Subscribe to streaming. Channel:",
  //   channelString
  // );
  // const subRequest = {
  //   action: "SubAdd",
  //   subs: [channelString],
  // };
  // socket.send(JSON.stringify(subRequest));
}

export function unsubscribeFromStream(subscriberUID) {
  // Find a subscription with id === subscriberUID
  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString);
    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler) => handler.id === subscriberUID
    );

    if (handlerIndex !== -1) {
      // Remove from handlers
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        // Unsubscribe from the channel if it was the last handler
        console.log(
          "[unsubscribeBars]: Unsubscribe from streaming. Channel:",
          channelString
        );
        const subRequest = {
          action: "SubRemove",
          subs: [channelString],
        };
        socket.send(JSON.stringify(subRequest));
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}
