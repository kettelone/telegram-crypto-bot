import dotenv from 'dotenv'
import axios from 'axios'
import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { Crypto } from './models/models.js'
import { UserResponse } from './telegram-bot/telegram-class.js'
dotenv.config()

const PORT = process.env.PORT || 80
const URI = `/webhook/${process.env.TELEGRAM_TOKEN}`
const webHookUrl = `${process.env.SERVER_URL}${URI}`
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`
const userResponse = new UserResponse()

const app = express()
app.use(bodyParser.json())

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
	await init()
	await startDB()
})

//on response from Telegram bot
app.post(URI, async (req, res) => {
	let tgMessage
	if (req.body.callback_query) {
		tgMessage = {
			data_callback_query: req.body.callback_query.data,
			text_callback_query: req.body.callback_query.message.text,
			userId_callback_query: req.body.callback_query.from.id,
			chatId_callback_query: req.body.callback_query.message.chat.id,
		}
	}

	if (req.body.message) {
		tgMessage = {
			name: req.body.message.from.first_name,
			chatId: req.body.message.chat.id,
			text: req.body.message.text,
			userId: req.body.message.from.id,
		}
	}

	//if inline keyboard button was pressed
	if (
		req.body.hasOwnProperty('callback_query') &&
		tgMessage.data_callback_query === 'ADD TO FAVOURITE'
	) {
		await userResponse.addToFavourite(
			tgMessage.text_callback_query.substring(
				2,
				tgMessage.text_callback_query.indexOf('\n')
			),
			tgMessage.userId_callback_query,
			tgMessage.chatId_callback_query
		)
	} else if (
		req.body.hasOwnProperty('callback_query') &&
		tgMessage.data_callback_query === 'REMOVE FROM FAVOURITE'
	) {
		await userResponse.removeFromFavourite(
			tgMessage.text_callback_query.substring(
				2,
				tgMessage.text_callback_query.indexOf('\n')
			),
			tgMessage.userId_callback_query,
			tgMessage.chatId_callback_query
		)
	} //if sticker was send
	else if (req.body.message.hasOwnProperty('sticker')) {
		return res.send()
	} //if text message was sent
	else if (tgMessage.text === '/start') {
		await userResponse.start(tgMessage.chatId, tgMessage.name)
	} else if (tgMessage.text === '/help') {
		await userResponse.help(tgMessage.chatId)
	} else if (tgMessage.text === '/list_recent') {
		await userResponse.listRecent(tgMessage.chatId)
	} else if (tgMessage.text === tgMessage.text.toUpperCase()) {
		const detailedInfo = await userResponse.detailedCoinInfo(
			tgMessage.text.substring(1)
		)
		// check if coin is already in the Favourite list
		if (detailedInfo) {
			await userResponse.exist(
				tgMessage.chatId,
				tgMessage.userId,
				detailedInfo,
				tgMessage.text.substring(1)
			)
		} else {
			await userResponse.wrongCommand(
				tgMessage.chatId,
				'Please specify coin name'
			)
		}
	} else if (
		tgMessage.text.includes('/addToFavourite') &&
		tgMessage.text === '/addToFavourite'
	) {
		await userResponse.wrongCommand(
			tgMessage.chatId,
			'Please specify coin name'
		)
	} else if (tgMessage.text.includes('/addToFavourite')) {
		const startIndex = text.indexOf(' ')
		const addCoin = text.substring(startIndex).trim()

		await userResponse.addToFavourite(
			addCoin,
			tgMessage.userId,
			tgMessage.chatId
		)
	} else if (tgMessage.text === '/list_favourite') {
		await userResponse.listFavourite(tgMessage.chatId, tgMessage.userId)
	} else if (
		tgMessage.text.includes('/deleteFavourite') &&
		tgMessage.text === '/deleteFavourite'
	) {
		await userResponse.wrongCommand(
			tgMessage.chatId,
			'Please specify coin name'
		)
	} else if (tgMessage.text.includes('/deleteFavourite')) {
		const startIndex = tgMessage.text.indexOf(' ')
		const deleteCoin = tgMessage.text.substring(startIndex).trim()

		const exist = await Crypto.findOne({
			symbol: `${deleteCoin}`,
			userId: tgMessage.userId,
		})
		if (!exist) {
			await userResponse.wrongCommand(
				tgMessage.chatId,
				`💰<b>${deleteCoin}</b> is not in your Favourite list`
			)
		} else {
			await userResponse.removeFromFavourite(
				deleteCoin,
				tgMessage.userId,
				tgMessage.chatId
			)
		}
	} else {
		await userResponse.wrongCommand(
			tgMessage.chatId,
			'Unknown command\nTry again...'
		)
	}
	return res.send()
})
