var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import dotenv from 'dotenv';
import axios from 'axios';
import { Crypto } from '../models/models.js';
import { COMMANDS, buttonAdd, buttonDelete, } from './telegram-index.js';
dotenv.config();
const urlCoinmarketcap = process.env.URL;
const coinMarketKey = process.env.COIN_MARKET_CAP_KEY;
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
export class UserResponse {
    start(chatId, name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios.post(`${telegramEndpoint}/sendSticker`, {
                    chat_id: chatId,
                    sticker: 'https://tlgrm.eu/_/stickers/b4d/bf5/b4dbf515-240d-34ee-8b31-e4bf61b25593/5.webp',
                });
            }
            catch (e) {
                console.log(e);
            }
            try {
                yield axios.post(`${telegramEndpoint}/sendMessage`, {
                    chat_id: chatId,
                    text: `Welcome ${name}`,
                });
            }
            catch (e) {
                console.log(name);
            }
        });
    }
    help(chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            let helpText = '';
            helpText += COMMANDS.map((command) => `🔻/${command.command}\n      <u><b>${command.description}</b></u>`).join(`\n`);
            try {
                yield axios.post(`${telegramEndpoint}/sendMessage`, {
                    chat_id: chatId,
                    text: helpText,
                    parse_mode: 'HTML',
                });
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    listRecent(chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recentList = yield axios
                    .get(urlCoinmarketcap, {
                    headers: { 'X-CMC_PRO_API_KEY': coinMarketKey },
                })
                    .then(response => response.data.data)
                    .then((data) => {
                    let list = '';
                    for (let k = 0; k < 25; k++) {
                        list += `/${data[k].symbol} $${data[k].quote.USD.price.toFixed(4)}\n`;
                    }
                    return list;
                });
                yield axios.post(`${telegramEndpoint}/sendMessage`, {
                    chat_id: chatId,
                    text: recentList,
                    parse_mode: 'HTML',
                });
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    detailedCoinInfo(coin) {
        return __awaiter(this, void 0, void 0, function* () {
            const detailedInfo = yield axios
                .get(urlCoinmarketcap, {
                headers: { 'X-CMC_PRO_API_KEY': coinMarketKey },
            })
                .then((response) => response.data.data)
                .then((data) => {
                for (const el of data) {
                    if (el.symbol === coin) {
                        return el;
                    }
                }
                return false;
            })
                .then((coinInfo) => {
                if (coinInfo) {
                    let infoList = `💰<b>${coinInfo.symbol}</b>\n\n`;
                    Object.keys(coinInfo.quote.USD).forEach((key) => {
                        infoList += `✅ <b>${key.toUpperCase()}</b>:\n       <u>${coinInfo.quote.USD[key]}</u>\n`;
                    });
                    return infoList;
                }
                else {
                    return false;
                }
            });
            return detailedInfo;
        });
    }
    listFavourite(chatId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let cryptoList = '';
            try {
                const favouriteCrypto = yield Crypto.find({ userId: userId });
                favouriteCrypto.map((el) => (cryptoList += `/${el.symbol} $${el.details.price.toFixed(4)}\n`));
            }
            catch (e) {
                console.log('Big error occured.......', e);
            }
            if (!cryptoList) {
                try {
                    yield axios.post(`${telegramEndpoint}/sendMessage`, {
                        chat_id: chatId,
                        text: `Your list is empty...`,
                        parse_mode: 'HTML',
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }
            else {
                try {
                    yield axios.post(`${telegramEndpoint}/sendMessage`, {
                        chat_id: chatId,
                        text: cryptoList,
                        parse_mode: 'HTML',
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }
        });
    }
    exist(chatId, userId, detailedCoinInfo, coin) {
        return __awaiter(this, void 0, void 0, function* () {
            const coinExist = yield Crypto.findOne({
                symbol: `${coin}`,
                userId: userId,
            });
            if (!coinExist) {
                try {
                    yield axios.post(`${telegramEndpoint}/sendMessage`, {
                        chat_id: chatId,
                        text: detailedCoinInfo,
                        parse_mode: 'HTML',
                        reply_markup: buttonAdd,
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }
            else {
                try {
                    yield axios.post(`${telegramEndpoint}/sendMessage`, {
                        chat_id: chatId,
                        text: detailedCoinInfo,
                        parse_mode: 'HTML',
                        reply_markup: buttonDelete,
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }
            // return
        });
    }
    addToFavourite(addCoin, userId, chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            const exist = yield Crypto.findOne({
                symbol: `${addCoin}`,
                userId: userId,
            });
            if (!exist) {
                yield axios
                    .get(urlCoinmarketcap, {
                    headers: {
                        'X-CMC_PRO_API_KEY': coinMarketKey,
                    },
                })
                    .then((response) => response.data.data)
                    .then((data) => {
                    for (const el of data) {
                        if (el.symbol === addCoin) {
                            return el;
                        }
                    }
                })
                    .then((coinToAdd) => {
                    if (coinToAdd) {
                        try {
                            const coinDocument = new Crypto({
                                name: coinToAdd.name,
                                symbol: coinToAdd.symbol,
                                dateAdded: coinToAdd.date_added,
                                details: coinToAdd.quote.USD,
                                userId: userId,
                            });
                            coinDocument.save(function (err) {
                                if (err)
                                    return console.error(err);
                                console.log('Document inserted succussfully!');
                            });
                            return true;
                        }
                        catch (e) {
                            return false;
                        }
                    }
                })
                    .then((status) => {
                    if (status) {
                        axios.post(`${telegramEndpoint}/sendMessage`, {
                            chat_id: chatId,
                            text: `💰<b>${addCoin}</b> has been added to Favourite list`,
                            parse_mode: 'HTML',
                        });
                    }
                    else {
                        axios.post(`${telegramEndpoint}/sendMessage`, {
                            chat_id: chatId,
                            text: `Invalid coin name...`,
                            parse_mode: 'HTML',
                        });
                    }
                });
            }
            else {
                yield axios.post(`${telegramEndpoint}/sendMessage`, {
                    chat_id: chatId,
                    text: `💰<b>${addCoin}</b> is already in your Favourite list`,
                    parse_mode: 'HTML',
                });
            }
        });
    }
    removeFromFavourite(deleteCoin, userId, chatId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                Crypto.deleteOne({ symbol: `${deleteCoin}`, userId: userId }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            catch (e) {
                console.log(e);
            }
            try {
                yield axios.post(`${telegramEndpoint}/sendMessage`, {
                    chat_id: chatId,
                    text: `💰<b>${deleteCoin}</b> has been removed from Favourite list`,
                    parse_mode: 'HTML',
                });
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    wrongCommand(chatId, text) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios.post(`${telegramEndpoint}/sendMessage`, {
                    chat_id: chatId,
                    text: `${text}`,
                    parse_mode: 'HTML',
                });
            }
            catch (e) {
                console.log(e);
            }
        });
    }
}
