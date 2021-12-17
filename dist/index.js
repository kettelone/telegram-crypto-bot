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
import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import { Crypto } from './models/models.js';
import { UserResponse } from './telegram-bot/telegram-class.js';
dotenv.config();
const PORT = process.env.PORT || 80;
const URI = `/webhook/${process.env.TELEGRAM_TOKEN}`;
const webHookUrl = `${process.env.SERVER_URL}${URI}`;
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;
const userResponse = new UserResponse();
const app = express();
app.use(bodyParser.json());
//Connect to DB
const startDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        mongoose.connect(process.env.DB_CONN_STRING);
    }
    catch (e) {
        console.log(e);
    }
    console.log('Connection to DB is Successful!');
});
//connect to Telegram bot
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield axios.get(`${telegramEndpoint}/setWebhook?url=${webHookUrl}`);
    }
    catch (e) {
        console.log(e);
    }
});
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server has been started on port ${PORT}`);
    yield init();
    yield startDB();
}));
//on response from Telegram bot
app.post(URI, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let tgMessage;
    let tgCallback;
    if (req.body.callback_query) {
        tgCallback = {
            data: req.body.callback_query.data,
            text: req.body.callback_query.message.text,
            userId: req.body.callback_query.from.id,
            chatId: req.body.callback_query.message.chat.id
        };
    }
    else if (req.body.message) {
        tgMessage = {
            name: req.body.message.from.first_name,
            chatId: req.body.message.chat.id,
            text: req.body.message.text,
            userId: req.body.message.from.id
        };
    }
    //if inline keyboard button was pressed
    if (tgCallback && tgCallback.data === 'ADD TO FAVOURITE') {
        yield userResponse.addToFavourite(tgCallback.text.substring(2, tgCallback.text.indexOf('\n')), tgCallback.userId, tgCallback.chatId);
    }
    else if (tgCallback && tgCallback.data === 'REMOVE FROM FAVOURITE') {
        yield userResponse.removeFromFavourite(tgCallback.text.substring(2, tgCallback.text.indexOf('\n')), tgCallback.userId, tgCallback.chatId);
    } //if sticker was send
    else if (req.body.message.sticker) {
        return res.send();
    } //if text message was sent
    else if (tgMessage && tgMessage.text === '/start') {
        yield userResponse.start(tgMessage.chatId, tgMessage.name);
    }
    else if (tgMessage && tgMessage.text === '/help') {
        yield userResponse.help(tgMessage.chatId);
    }
    else if (tgMessage && tgMessage.text === '/list_recent') {
        yield userResponse.listRecent(tgMessage.chatId);
    }
    else if (tgMessage && tgMessage.text === tgMessage.text.toUpperCase()) {
        const detailedInfo = yield userResponse.detailedCoinInfo(tgMessage.text.substring(1));
        // check if coin is already in the Favourite list
        if (typeof detailedInfo === 'string') {
            yield userResponse.exist(tgMessage.chatId, tgMessage.userId, detailedInfo, tgMessage.text.substring(1));
        }
        else {
            yield userResponse.wrongCommand(tgMessage.chatId, 'Please specify coin name');
        }
    }
    else if (tgMessage && tgMessage.text === '/addToFavourite') {
        yield userResponse.wrongCommand(tgMessage.chatId, 'Please specify coin name');
    }
    else if (tgMessage && tgMessage.text.includes('/addToFavourite')) {
        const startIndex = tgMessage.text.indexOf(' ');
        const addCoin = tgMessage.text.substring(startIndex).trim();
        yield userResponse.addToFavourite(addCoin, tgMessage.userId, tgMessage.chatId);
    }
    else if (tgMessage && tgMessage.text === '/list_favourite') {
        yield userResponse.listFavourite(tgMessage.chatId, tgMessage.userId);
    }
    else if (tgMessage &&
        tgMessage.text.includes('/deleteFavourite') &&
        tgMessage.text === '/deleteFavourite') {
        yield userResponse.wrongCommand(tgMessage.chatId, 'Please specify coin name');
    }
    else if (tgMessage && tgMessage.text.includes('/deleteFavourite')) {
        const startIndex = tgMessage.text.indexOf(' ');
        const deleteCoin = tgMessage.text.substring(startIndex).trim();
        const exist = yield Crypto.findOne({
            symbol: `${deleteCoin}`,
            userId: tgMessage.userId,
        });
        if (!exist) {
            yield userResponse.wrongCommand(tgMessage.chatId, `💰<b>${deleteCoin}</b> is not in your Favourite list`);
        }
        else {
            yield userResponse.removeFromFavourite(deleteCoin, tgMessage.userId, tgMessage.chatId);
        }
    }
    else if (tgMessage) {
        yield userResponse.wrongCommand(tgMessage.chatId, 'Unknown command\nTry again...');
    }
    return res.send();
}));
