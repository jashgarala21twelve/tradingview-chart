import {
  ALPACA_API_URL,
  ALPACA_AUTH_TOKEN,
  SUPPORTED_RESOLUTIONS_VALUES,
} from "./constant.js";

// Get a CryptoCompare API key CryptoCompare https://www.cryptocompare.com/coins/guides/how-to-use-our-api/
export const apiKey =
  "d7a0472f5ab5476409d078b87d97e0520bd2650975ec4ef3c5e4eed7c2a4765f";
// Makes requests to CryptoCompare API
export async function makeApiRequest(path) {
  try {
    const url = new URL(`https://min-api.cryptocompare.com/${path}`);
    url.searchParams.append("api_key", apiKey);
    const response = await fetch(url.toString());
    return response.json();
  } catch (error) {
    throw new Error(`CryptoCompare request error: ${error.status}`);
  }
}
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
      Authorization: ALPACA_AUTH_TOKEN,
    });
    return alpacaData;
  } catch (error) {
    throw new Error(`CryptoCompare request error: ${error.status}`);
  }
}
export async function makeAlpacaBrokerApiRequest(method, path) {
  try {
    const BROKER_URL = ALPACA_API_URL.BROKER + "/v1/" + path;
    const { data: alpacaData, error } = await makeApiCall(method, BROKER_URL, {
      Authorization: ALPACA_AUTH_TOKEN,
    });
    return alpacaData;
  } catch (error) {
    throw new Error(`CryptoCompare request error: ${error.status}`);
  }
}

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
  console.log("timeframe",timeframe)
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
    case SUPPORTED_RESOLUTIONS_VALUES._60MINUTE:
      date.setHours(date.getHours() + 1);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._6HOURS:
      date.setHours(date.getHours() + 6);
      break;
    case SUPPORTED_RESOLUTIONS_VALUES._1DAY:
      date.setDate(date.getDate() + 1);
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
