import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { Crypto } from "./models/models.js";
import { userResponse } from "./telegram-bot/telegram-class.js";
const PORT = process.env.PORT || 80;
const URI = `/webhook/${process.env.TELEGRAM_TOKEN}`;
const webHookUrl = process.env.SERVER_URL + URI;
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

const app = express();
app.use(bodyParser.json());

//Connect to DB
const startDB = () => {
  mongoose
    .connect(process.env.DB_CONN_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((error) => console.log(error));

  //Get the default connection
  let db = mongoose.connection;

  db.once("open", function () {
    console.log("Connection to DB is Successful!");
  });
};

//connect to Telegram bot
const init = async () => {
  let response = await axios.get(
    `${telegramEndpoint}/setWebhook?url=${webHookUrl}`
  );
  return response;
};

app.listen(PORT, async () => {
  init();
  startDB();
  console.log(`Server has been started on port ${PORT}`);
});
app.get("/", (req, res) => {
  res.json("Seems it works");
});
//on response from Telegram bot
app.post(URI, async (req, res) => {
  //if inline keyboard button was pressed
  if (req.body.hasOwnProperty("callback_query")) {
    const text = req.body.callback_query.message.text,
      userId = req.body.callback_query.from.id,
      chatId = req.body.callback_query.message.chat.id,
      coin = text.substring(2, text.indexOf("\n"));

    if (req.body.callback_query.data === "ADD TO FAVOURITE") {
      await userResponse.addToFavourite(coin, userId, chatId);
    } else if (req.body.callback_query.data === "REMOVE FROM FAVOURITE") {
      await userResponse.removeFromList(coin, userId, chatId);
    }
  } //if sticker was send
  else if (req.body.message.hasOwnProperty("sticker")) {
    return res.send();
  } //if text message was sent
  else {
    const name = req.body.message.from.first_name,
      chatId = req.body.message.chat.id,
      text = req.body.message.text,
      userId = req.body.message.from.id;

    if (text === "/start") {
      userResponse.start(chatId, name);
    } else if (text === "/help") {
      userResponse.help(chatId);
    } else if (text === "/list_recent") {
      userResponse.listRecent(chatId);
    } else if (text === text.toUpperCase()) {
      let coin = text.substring(1);
      let detailedCoinInfo = await userResponse.detailedCoinInfo(coin);

      // check if coin is already in the Favourite list
      if (detailedCoinInfo) {
        userResponse.exist(chatId, userId, detailedCoinInfo, coin);
      }
    } else if (text.includes("/addToFavourite")) {
      let startIndex = text.indexOf(" ");
      let addCoin = text.substring(startIndex).trim();

      //if coin name was not specified
      if (addCoin === "/addToFavourite") {
        await userResponse.specifyCoin(chatId);
      } else {
        await userResponse.addToFavourite(addCoin, userId, chatId);
      }
    } else if (text === "/list_favourite") {
      await userResponse.listFavourite(chatId, userId);
    } else if (text.includes("/deleteFavourite")) {
      let startIndex = text.indexOf(" ");
      let deleteCoin = text.substring(startIndex).trim();

      if (deleteCoin === "/deleteFavourite") {
        await userResponse.specifyCoin(chatId);
      } else {
        let exist = await Crypto.findOne({
          symbol: `${deleteCoin}`,
          userId: userId,
        });

        if (!exist) {
          await userResponse.dontExist(chatId, deleteCoin);
        } else {
          await userResponse.removeFromList(deleteCoin, userId, chatId);
        }
      }
    } else {
      await userResponse.unknownCommand(chatId);
    }
  }
  return res.send();
});
