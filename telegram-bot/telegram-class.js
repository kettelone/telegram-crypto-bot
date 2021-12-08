import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { Crypto } from "../models/models.js";
import {
  COMMANDS,
  buttonAdd,
  buttonDelete,
} from "../telegram-bot/telegram-index.js";
const urlCoinmarketcap = process.env.URL;
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

class UserResponse {
  async start(chatId, name) {
    try {
      await axios.post(`${telegramEndpoint}/sendSticker`, {
        chat_id: chatId,
        sticker:
          "https://tlgrm.eu/_/stickers/b4d/bf5/b4dbf515-240d-34ee-8b31-e4bf61b25593/5.webp",
      });
    } catch (e) {
      console.log(e);
    }

    try {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: `Welcome ${name}`,
      });
    } catch (e) {
      console.log(name);
    }
  }

  async help(chatId) {
    let helpText = "";
    helpText += COMMANDS.map(
      (command) =>
        `🔻/${command.command}\n      <u><b>${command.description}</b></u>`
    ).join(`\n`);

    try {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: helpText,
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  async listRecent(chatId) {
    try {
      let recentList = await axios
        .get(urlCoinmarketcap, {
          headers: { "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_CAP_KEY },
        })
        .then((response) => response.data.data)
        .then(function (data) {
          let list = "";

          for (let k = 0; k < 25; k++) {
            list += `/${data[k].symbol} $${data[k].quote.USD.price.toFixed(
              4
            )}\n`;
          }
          return list;
        });

      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: recentList,
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  async detailedCoinInfo(coin) {
    let detailedInfo = await axios
      .get(urlCoinmarketcap, {
        headers: { "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_CAP_KEY },
      })
      .then((response) => response.data.data)
      .then((data) => {
        for (let el of data) {
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
            infoList += `✅ <b>${key.toUpperCase()}</b>:\n       <u>${
              coinInfo.quote.USD[key]
            }</u>\n`;
          });
          return infoList;
        } else {
          return false;
        }
      });
    return detailedInfo;
  }

  async listFavourite(chatId, userId) {
    let cryptoList = "";
    try {
      let favouriteCrypto = await Crypto.find({ userId: userId });

      favouriteCrypto.map(
        (el) =>
          (cryptoList += `/${el.symbol} $${el.details.price.toFixed(4)}\n`)
      );
    } catch (e) {
      console.log("Big eroor occured.......", e);
    }

    if (!cryptoList) {
      try {
        await axios.post(`${telegramEndpoint}/sendMessage`, {
          chat_id: chatId,
          text: `Your list is empty...`,
          parse_mode: "HTML",
        });
      } catch (e) {
        console.log(e);
      }
    } else {
      try {
        await axios.post(`${telegramEndpoint}/sendMessage`, {
          chat_id: chatId,
          text: cryptoList,
          parse_mode: "HTML",
        });
      } catch (e) {
        console.log(e);
      }
    }
  }

  async exist(chatId, userId, detailedCoinInfo, coin) {
    let coinExist = await Crypto.findOne({
      symbol: `${coin}`,
      userId: userId,
    });

    if (!coinExist) {
      try {
        await axios.post(`${telegramEndpoint}/sendMessage`, {
          chat_id: chatId,
          text: detailedCoinInfo,
          parse_mode: "HTML",
          reply_markup: buttonAdd,
        });
      } catch (e) {
        console.log(e);
      }
    } else {
      try {
        await axios.post(`${telegramEndpoint}/sendMessage`, {
          chat_id: chatId,
          text: detailedCoinInfo,
          parse_mode: "HTML",
          reply_markup: buttonDelete,
        });
      } catch (e) {
        console.log(e);
      }
    }
    return;
  }

  async dontExist(chatId, deleteCoin) {
    try {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: `💰<b>${deleteCoin}</b> is not in your Favourite list`,
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }

  async addToFavourite(addCoin, userId, chatId) {
    let exist = await Crypto.findOne({
      symbol: `${addCoin}`,
      userId: userId,
    });

    if (!exist) {
      await axios
        .get(urlCoinmarketcap, {
          headers: {
            "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_CAP_KEY,
          },
        })
        .then((response) => response.data.data)
        .then((data) => {
          for (let el of data) {
            if (el.symbol === addCoin) {
              return el;
            }
          }
        })
        .then((coinToAdd) => {
          try {
            let coinDocument = new Crypto({
              name: coinToAdd.name,
              symbol: coinToAdd.symbol,
              dateAdded: coinToAdd.date_added,
              details: coinToAdd.quote.USD,
              userId: userId,
            });

            coinDocument.save(function (err, doc) {
              if (err) return console.error(err);
              console.log("Document inserted succussfully!");
            });
            return true;
          } catch (e) {
            return false;
          }
        })
        .then((status) => {
          if (status) {
            axios.post(`${telegramEndpoint}/sendMessage`, {
              chat_id: chatId,
              text: `💰<b>${addCoin}</b> has been added to Favourite list`,
              parse_mode: "HTML",
            });
          } else {
            axios.post(`${telegramEndpoint}/sendMessage`, {
              chat_id: chatId,
              text: `Invalid coin name...`,
              parse_mode: "HTML",
            });
          }
        });
    } else {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: `💰<b>${addCoin}</b> is already in your Favourite list`,
        parse_mode: "HTML",
      });
    }
    return;
  }

  async removeFromList(deleteCoin, userId, chatId) {
    try {
      Crypto.deleteOne(
        { symbol: `${deleteCoin}`, userId: userId },
        function (err, docs) {
          if (err) {
            console.log(err);
          }
        }
      );
    } catch (e) {
      console.log(e);
    }

    try {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: `💰<b>${deleteCoin}</b> has been removed from Favourite`,
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
    return;
  }

  async specifyCoin(chatId) {
    try {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: `Please specify coin name`,
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
    return;
  }

  async unknownCommand(chatId) {
    try {
      await axios.post(`${telegramEndpoint}/sendMessage`, {
        chat_id: chatId,
        text: `Unknown command\nTry again...`,
        parse_mode: "HTML",
      });
    } catch (e) {
      console.log(e);
    }
  }
  return;
}

let userResponse = new UserResponse();
export { userResponse };
