import { isSmallTimeFrame } from "./constant.js";
import {
  parseFullSymbol,
  getNextMinuteBarTime,
  getNextBarTime,
  isSameDay,
} from "./helpers.js";

// http://prospuh.io:2001

const socket = io("http://localhost:5000");
const channelToSubscription = new Map();

socket.on("connect", () => {
  console.log("[socket.io] Connected to server");
});
socket.on("subscribe_trades", (data) => {
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
  console.log("CCCCCCCCCC [stream]", subscriptionItem);
  let currentTimeFrame = window.activeResolution;

  const lastDailyBar = subscriptionItem?.lastBars[currentTimeFrame];
  console.log(
    "[LASTBAR] - STREAM",
    new Date(lastDailyBar.time).toTimeString(),
    new Date(lastDailyBar.time).toDateString()
  );
  const nextDailyBarTime = getNextBarTime(lastDailyBar?.time, currentTimeFrame);
  console.log("nextDailyBarTime", nextDailyBarTime);
  // console.log(
  //   "lastDailyBar nextDailyBarTime tradeTime",
  //   lastDailyBar?.time,
  //   nextDailyBarTime,
  //   tradeTime
  // );

  // console.log({
  //   subscriptionItem,
  //   tradeTime,
  //   tradeTimeReadable: formatTime(tradeTime),
  //   lastDailyBarTime: lastDailyBar?.time,
  //   lastDailyBarTimeReadable: lastDailyBar
  //     ? formatTime(lastDailyBar?.time)
  //     : "N/A",
  //   nextDailyBarTime,
  //   nextMinuteBarTimeReadable: formatTime(nextDailyBarTime),
  // });
  let bar;

  console.log(tradeTime >= nextDailyBarTime, "IsNewBar");

  console.table([
    {
      Label: "Trade Time",
      Time: new Date(tradeTime).toTimeString(),
      Date: new Date(tradeTime).toDateString(),
    },
    {
      Label: "Last Daily Bar Time",
      Time: new Date(lastDailyBar.time).toTimeString(),
      Date: new Date(lastDailyBar.time).toDateString(),
    },
    {
      Label: "Next Daily Bar Time",
      Time: new Date(nextDailyBarTime).toTimeString(),
      Date: new Date(nextDailyBarTime).toDateString(),
    },
  ]);
  console.log(isSmallTimeFrame(currentTimeFrame), "isSmallTimeFrame");
  // if (isSmallTimeFrame(currentTimeFrame)) {
  //   console.log(
  //     isSameDay(new Date(lastDailyBar.time), new Date(tradeTime)),
  //     "isSameDay"
  //   );
  //   if (!isSameDay(new Date(lastDailyBar.time), new Date(tradeTime))) {
  //     return;
  //   }
  // }

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

  subscriptionItem.lastBars[currentTimeFrame] = bar;

  // //   // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
  console.log("SUBBBBBBBBBBBBBBBBB", subscriptionItem);

  // if (bar.time === lastDailyBar.time) {
  //   subscriptionItem.handlers.forEach((handler) => handler.callback(bar)); // Update the most recent bar
  //   subscriptionItem.lastDailyBar = bar; // Update the last bar in the subscription
  // } else if (bar.time > lastDailyBar.time) {
  //   subscriptionItem.handlers.forEach((handler) => handler.callback(bar)); // Add a new bar
  // } else {
  //   subscriptionItem.handlers.forEach((handler) =>
  //     handler.onResetCacheNeededCallback()
  //   ); // Trigger a cache reset
  // }
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
  console.log(
    "[LASTBAR]-SUBSCRIBE INSIDE",
    new Date(lastDailyBar.time).toTimeString(),
    new Date(lastDailyBar.time).toDateString()
  );
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
    onResetCacheNeededCallback: onResetCacheNeededCallback,
  };
  let subscriptionItem = channelToSubscription.get(channelString);
  console.log("CCCCCCCCCC [subscribe] BEFORE SET", subscriptionItem);

  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    // subscriptionItem.resolution = resolution;
    subscriptionItem.handlers.push(handler);
    // subscriptionItem.subscriberUID = subscriberUID;
    subscriptionItem.lastBars = {
      ...subscriptionItem?.lastBars,
      [resolution]: lastDailyBar,
    };
    // channelToSubscription.set(channelString, subscriptionItem);
    console.log("CCCCCCCCCC [subscribe] AFTER SET", subscriptionItem);
    return;
  }
  subscriptionItem = {
    subscriberUID,
    resolution,
    lastBars: {
      [resolution]: lastDailyBar,
    },
    handlers: [handler],
  };

  channelToSubscription.set(channelString, subscriptionItem);
  console.log(
    "[subscribeBars]: Subscribe to streaming. Channel:",
    channelString
  );
  console.log("CCCCCCCCCC [subscribe] AFTER SET", subscriptionItem);
  socket.emit("subscribe", { type: "trades", symbol: symbolInfo.name });
  window.isSubscribeCalledOnResolutionChange = true;
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
    console.log("subscriptionItemmmm", subscriptionItem);
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
        // const subRequest = {
        //   action: "SubRemove",
        //   subs: [channelString],
        // };
        // socket.send(JSON.stringify(subRequest));
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}
