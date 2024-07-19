import { ALPACA_API_URL, ALPACA_AUTH_TOKEN } from "./constant.js";

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

export function getResolution(resolution) {
  let timeframe;
  switch (resolution) {
    case "60":
      timeframe = "1hour";
      break;
    case "1":
      timeframe = "1min";
      break;
    case "15":
      timeframe = "15min";
      break;
    case "30":
      timeframe = "30min";
      break;
    case "1D":
      timeframe = "1day";
      break;
    case "360":
      timeframe = "6hour";
      break;
    case "1W":
      timeframe = "1week";
      break;
    case "2W":
      timeframe = "2week";
      break;
    case "1M":
      timeframe = "1month";
      break;
  }
  return timeframe;
}

export function getNextMinuteBarTime(barTime) {
  const date = new Date(barTime); // barTime is in milliseconds
  date.setMinutes(date.getMinutes() + 1); // Add one minute
  return date.getTime(); // Return in milliseconds
}


export const getLatestEndDate = () => {
  const now = new Date();

  const marketOpen = new Date(now);
  marketOpen.setUTCHours(13, 30, 0, 0); // 9:30 AM ET in UTC

  const marketClose = new Date(now);
  marketClose.setUTCHours(20, 0, 0, 0); // 4:00 PM ET in UTC

  if (now >= marketOpen && now <= marketClose) {
    return now.toISOString(); // Current time within market hours
  } else {
    return marketClose.toISOString(); // Last market close time
  }
};