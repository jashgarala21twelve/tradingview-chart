import {
  ALPACA_API_URL,
  BASE_URL,
  SUPPORTED_RESOLUTIONS_VALUES,
} from "./constant.js";

const makeApiCall = async (method, url, headers) => {
  try {
    const response = await axios({ method, url, headers });
    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};
export async function makeAlpacaMarketApiRequest(method, path) {
  try {
    const MARKET_URL = ALPACA_API_URL.MARKET + "/v2/" + path;
    const { data: alpacaData, error } = await makeApiCall(method, MARKET_URL, {
      Authorization:
        "Basic Q0szOTJGRFE3NDFGSDdaNkY4Ulk6em5rOHQxMEJTc292UHJxaThoZDQ1aGNiUXRuakxjaDFHM0x1cHlQOA==",
    });
    console.log("alpacaData", alpacaData);
    return alpacaData;
  } catch (error) {
    console.log("Errorrrrr", error.message);
    throw new Error(`CryptoCompare request error: ${error.status}`);
  }
}
// export async function makeAlpacaBrokerApiRequest(method, path) {
//   try {
//     const BROKER_URL = ALPACA_API_URL.BROKER + "/v1/" + path;
//     const { data: alpacaData, error } = await makeApiCall(method, BROKER_URL, {
//       Authorization: ALPACA_AUTH_TOKEN,
//     });
//     return alpacaData;
//   } catch (error) {
//     throw new Error(`CryptoCompare request error: ${error.status}`);
//   }
// }

export const fetchAllHistoricalAlpacaData = async (baseUrl) => {
  let allAlpacaData = [];
  let next_page_token = null;
  let url = baseUrl;

  while (true) {
    const response = await makeAlpacaMarketApiRequest("get", url);

    const { bars, next_page_token: new_page_token } = response;

    // Accumulate the fetched data
    allAlpacaData = [...allAlpacaData, ...bars];

    // Set the next page token for the next iteration
    next_page_token = new_page_token;

    if (!next_page_token) {
      break; // Exit the loop if there's no next page token
    }

    // Update the URL with the new page token
    url = `${baseUrl}&page_token=${next_page_token}`;
    console.log(url, "url");
  }

  return allAlpacaData;
};

export const getLatestBar = async (symbol) => {
  let API_URL = `stocks/${symbol}/bars/latest`;
  const data = await makeAlpacaMarketApiRequest("get", API_URL);

  return data;
};

export const getAllAssets = async () => {
  const URL = BASE_URL + "/api/shares/fetchAllShare";
  const { data: response, error } = await makeApiCall("get", URL, {});
  return response?.data;
};
// Generates a symbol ID from a pair of the coins
export function generateSymbol(exchange, fromSymbol, toSymbol) {
  const short = `${fromSymbol}/${toSymbol}`;
  return {
    short,
    full: `${exchange}:${short}`,
  };
}

// Returns all parts of the symbol
export function parseFullSymbol(fullSymbol) {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
  if (!match) {
    return null;
  }

  return {
    exchange: match[1],
    fromSymbol: match[2],
    toSymbol: match[3],
  };
}

export function getNextMinuteBarTime(barTime) {
  const date = new Date(barTime); // barTime is in milliseconds
  date.setMinutes(date.getMinutes() + 1); // Add one minute
  return date.getTime(); // Return in milliseconds
}

export function getNextBarTime(time, timeframe) {
  // console.log("TIMEEEEE:", time, timeframe);
  const date = new Date(time); // time is in milliseconds
  switch (timeframe) {
    case SUPPORTED_RESOLUTIONS_VALUES._1MINUTE:
      date.setMinutes(date.getMinutes() + 1);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._2MINUTE:
      date.setMinutes(date.getMinutes() + 2);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._15MINUTE:
      date.setMinutes(date.getMinutes() + 15);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._30MINUTE:
      date.setMinutes(date.getMinutes() + 30);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._1HOUR:
      date.setHours(date.getHours() + 1);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._2HOURS:
      date.setHours(date.getHours() + 2);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._3HOURS:
      date.setHours(date.getHours() + 3);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._4HOURS:
      date.setDate(date.getDate() + 4);
      break;

    case SUPPORTED_RESOLUTIONS_VALUES._1WEEK:
      date.setDate(date.getDate() + 7);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._2WEEK:
      date.setDate(date.getDate() + 14);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._1MONTH:
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      throw new Error("Unsupported timeframe");
  }

  return date.getTime(); // Return in milliseconds
}

export function getLatestEndDateForGraph() {
  const date = new Date();
  // Subtract 15 minutes
  date.setMinutes(date.getMinutes() - 15);
  return date.toISOString();
}
export const adjustToWeekday = (date) => {
  const day = date.getUTCDay();
  if (day === 6) {
    // Saturday
    date.setUTCDate(date.getUTCDate() - 1);
  } else if (day === 0) {
    // Sunday
    date.setUTCDate(date.getUTCDate() - 2);
  }
  return date;
};

export const isSameDay = (date1, date2) => {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
};

// export const generateStaticBars = (resolution, count) => {
//   const bars = [];
//   const baseTime = new Date().getTime();
//   const oneMinute = 60 * 1000;
//   const thirtyMinutes = 30 * oneMinute;
//   const sixHours = 6 * 60 * oneMinute;
//   if (count === 1) {
//     return [];
//   }
//   let interval;
//   switch (resolution) {
//     case "1":
//       interval = oneMinute;
//       break;
//     case "2":
//       interval = oneMinute;
//       break;
//     case "30":
//       interval = thirtyMinutes;
//       break;
//     case "6H":
//       interval = sixHours;
//       break;
//     default:
//       return bars;
//   }

//   for (let i = 0; i < 5; i++) {
//     bars.push({
//       time: baseTime - (5 - i) * interval,
//       low: 144 + i,
//       high: 147 + i,
//       open: 145 + i,
//       close: 146 + i,
//       volume: 1000 + i * 100,
//     });
//   }
//   return bars;
// };
export const generateStaticBars = (resolution, count) => {
  const bars = [];
  const baseTime = new Date().getTime();

  if (count === 1) {
    return [];
  }
  console.log("resolution", resolution);
  let interval;
  switch (resolution) {
    case SUPPORTED_RESOLUTIONS_VALUES._1MINUTE:
      interval = 1 * 60 * 1000; // 1 minute in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._2MINUTE:
      interval = 2 * 60 * 1000; // 2 minutes in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._15MINUTE:
      interval = 15 * 60 * 1000; // 15 minutes in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._30MINUTE:
      interval = 30 * 60 * 1000; // 30 minutes in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._60MINUTE:
      interval = 60 * 60 * 1000; // 1 hour in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._6HOURS:
      interval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._1DAY:
      interval = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._1WEEK:
      interval = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._2WEEK:
      interval = 14 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._1MONTH:
      interval = 30 * 24 * 60 * 60 * 1000; // Approximate 1 month in milliseconds
      break;
    default:
      return bars;
  }

  for (let i = 0; i < 5; i++) {
    bars.push({
      time: baseTime - (5 - i) * interval,
      low: 144 + i,
      high: 147 + i,
      open: 145 + i,
      close: 146 + i,
      volume: 1000 + i * 100,
    });
  }

  return bars;
};
export function extractResolution(symbol) {
  const parts = symbol.split("_#_");
  if (parts.length === 2) {
    return parts[1];
  }
  throw new Error("Invalid symbol format");
}
export function extractAndCombineResolution(symbol, currentResolution) {
  const parts = symbol.split("_#_");
  if (parts.length === 2) {
    return `${parts[0]}_#_${currentResolution}`;
  }
  throw new Error("Invalid symbol format");
}
