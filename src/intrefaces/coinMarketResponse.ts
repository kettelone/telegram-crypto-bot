//CoinMarket response interfaces

interface USD {
    [index: string]: number | string;
    price: number;

}

interface CoinObjects  {
    name: string;
    symbol: string;
    date_added: string;
    quote: {
        USD: USD;
    }
}

interface CoinMarketResponse  {
    data: Array<CoinObjects>;
}

export {CoinMarketResponse}
