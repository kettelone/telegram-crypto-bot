import dotenv from 'dotenv'
dotenv.config()
import axios from 'axios'
import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { Crypto } from './models/models.js'
import { userResponse } from './telegram-bot/telegram-class.js'
const PORT = process.env.PORT || 80
const URI = `/webhook/${process.env.TELEGRAM_TOKEN}`
const webHookUrl = process.env.SERVER_URL + URI
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`

const app = express()
app.use(bodyParser.json())

// every 15 minutes send a request to the app to prevent from falling asleep
setInterval(async () => {
  const appUrl = 'https://heroku-tg-crypto-bot.herokuapp.com/'
  await axios.get(appUrl)
}, 15 * 60 * 1000)

//Connect to DB
const startDB = async () => {
	try {
		await mongoose.connect(process.env.DB_CONN_STRING, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
	} catch (e) {
		console.log(e)
	}
	console.log('Connection to DB is Successful!')
}

//connect to Telegram bot
const init = async () => {
	try {
		await axios.get(`${telegramEndpoint}/setWebhook?url=${webHookUrl}`)
	} catch (e) {
		console.log(e)
	}
}

app.listen(PORT, async () => {
	console.log(`Server has been started on port ${PORT}`)
	init()
	startDB()
})

//on response from Telegram bot
app.post(URI, async (req, res) => {
	//if inline keyboard button was pressed
	if (req.body.hasOwnProperty('callback_query')) {
		const data = req.body.callback_query.data,
			text = req.body.callback_query.message.text,
			userId = req.body.callback_query.from.id,
			chatId = req.body.callback_query.message.chat.id,
			coin = text.substring(2, text.indexOf('\n'))

		if (data === 'ADD TO FAVOURITE') {
			userResponse.addToFavourite(coin, userId, chatId)
		} else if (data === 'REMOVE FROM FAVOURITE') {
			userResponse.removeFromFavourite(coin, userId, chatId)
		}
	} //if sticker was send
	else if (req.body.message.hasOwnProperty('sticker')) {
		return res.send()
	} //if text message was sent
	else {
		const name = req.body.message.from.first_name,
			chatId = req.body.message.chat.id,
			text = req.body.message.text,
			userId = req.body.message.from.id

		if (text === '/start') {
			userResponse.start(chatId, name)
		} else if (text === '/help') {
			userResponse.help(chatId)
		} else if (text === '/list_recent') {
			userResponse.listRecent(chatId)
		} else if (text === text.toUpperCase()) {
			let coin = text.substring(1)
			let detailedInfo = await userResponse.detailedCoinInfo(coin)

			// check if coin is already in the Favourite list
			if (detailedInfo) {
				userResponse.exist(chatId, userId, detailedInfo, coin)
			} else {
				userResponse.specifyCoin(chatId)
			}
		} else if (text.includes('/addToFavourite')) {
			let startIndex = text.indexOf(' ')
			let addCoin = text.substring(startIndex).trim()

			//if coin name was not specified
			if (addCoin === '/addToFavourite') {
				userResponse.specifyCoin(chatId)
			} else {
				userResponse.addToFavourite(addCoin, userId, chatId)
			}
		} else if (text === '/list_favourite') {
			userResponse.listFavourite(chatId, userId)
		} else if (text.includes('/deleteFavourite')) {
			let startIndex = text.indexOf(' ')
			let deleteCoin = text.substring(startIndex).trim()

			if (deleteCoin === '/deleteFavourite') {
				userResponse.specifyCoin(chatId)
			} else {
				let exist = await Crypto.findOne({
					symbol: `${deleteCoin}`,
					userId: userId,
				})

				if (!exist) {
					userResponse.dontExist(chatId, deleteCoin)
				} else {
					userResponse.removeFromFavourite(deleteCoin, userId, chatId)
				}
			}
		} else {
			userResponse.unknownCommand(chatId)
		}
	}
	return res.send()
})
