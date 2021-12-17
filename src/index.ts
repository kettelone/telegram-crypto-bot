import dotenv from 'dotenv'
import axios from 'axios'
import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { Crypto, ICrypto} from './models/models.js'
import { UserResponse } from './telegram-bot/telegram-class.js'
import {RequestType} from './intrefaces/telegramResponse'
dotenv.config()

const PORT = process.env.PORT || 80
const URI = `/webhook/${process.env.TELEGRAM_TOKEN}`
const webHookUrl = `${process.env.SERVER_URL}${URI}`
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`
const userResponse = new UserResponse()

const app = express()
app.use(bodyParser.json())

//Connect to DB
const startDB = async (): Promise<void> => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		mongoose.connect(process.env.DB_CONN_STRING!)
	} catch (e) {
		console.log(e)
	}
	console.log('Connection to DB is Successful!')
}

//connect to Telegram bot
const init = async () : Promise<void> => {
	try {
		await axios.get(`${telegramEndpoint}/setWebhook?url=${webHookUrl}`)
	} catch (e) {
		console.log(e)
	}
}

app.listen(PORT, async (): Promise<void> => {
	console.log(`Server has been started on port ${PORT}`)
	await init()
	await startDB()
})


//on response from Telegram bot
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.post(URI, async (req: RequestType , res:any) => {

let tgMessage;
let tgCallback;

	if (req.body.callback_query) {
		tgCallback = {
			data: req.body.callback_query.data,
			text: req.body.callback_query.message.text,
			userId: req.body.callback_query.from.id,
			chatId: req.body.callback_query.message.chat.id
		}


	}else if(req.body.message) {
		tgMessage = {
			name: req.body.message.from.first_name,
			chatId: req.body.message.chat.id,
			text: req.body.message.text,
			userId: req.body.message.from.id
		}
	}

	//if inline keyboard button was pressed
	if (tgCallback && tgCallback.data === 'ADD TO FAVOURITE'
	) {
		await userResponse.addToFavourite(
			tgCallback.text.substring(
				2,
				tgCallback.text.indexOf('\n')
			),
			tgCallback.userId,
			tgCallback.chatId
		)
	} else if (tgCallback && tgCallback.data === 'REMOVE FROM FAVOURITE') {
		await userResponse.removeFromFavourite(
			tgCallback.text.substring(
				2,
				tgCallback.text.indexOf('\n')
			),
			tgCallback.userId,
			tgCallback.chatId
		)
	} //if sticker was send
	// eslint-disable-next-line no-prototype-builtins
	else if (req.body.message.hasOwnProperty('sticker')) {
		return res.send()
	} //if text message was sent
	else if (tgMessage && tgMessage.text === '/start') {
		await userResponse.start(tgMessage.chatId, tgMessage.name)
	} else if (tgMessage && tgMessage.text === '/help') {
		await userResponse.help(tgMessage.chatId)
	} else if (tgMessage && tgMessage.text === '/list_recent') {
		await userResponse.listRecent(tgMessage.chatId)
	} else if (tgMessage && tgMessage.text === tgMessage.text.toUpperCase()) {
		const detailedInfo = await userResponse.detailedCoinInfo(
			tgMessage.text.substring(1)
		)
		// check if coin is already in the Favourite list
		if (typeof detailedInfo === 'string') {
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
		tgMessage && 
		tgMessage.text.includes('/addToFavourite') &&
		tgMessage.text === '/addToFavourite'
	) {
		await userResponse.wrongCommand(
			tgMessage.chatId,
			'Please specify coin name'
		)
	} else if (tgMessage && tgMessage.text.includes('/addToFavourite')) {
		const startIndex = tgMessage.text.indexOf(' ')
		const addCoin = tgMessage.text.substring(startIndex).trim()

		await userResponse.addToFavourite(
			addCoin,
			tgMessage.userId,
			tgMessage.chatId
		)
	} else if (tgMessage &&  tgMessage.text === '/list_favourite') {
		await userResponse.listFavourite(tgMessage.chatId, tgMessage.userId)
	} else if (
		tgMessage && 
		tgMessage.text.includes('/deleteFavourite') &&
		tgMessage.text === '/deleteFavourite'
	) {
		await userResponse.wrongCommand(
			tgMessage.chatId,
			'Please specify coin name'
		)
	} else if (tgMessage && tgMessage.text.includes('/deleteFavourite')) {
		const startIndex = tgMessage.text.indexOf(' ')
		const deleteCoin = tgMessage.text.substring(startIndex).trim()

		const exist: ICrypto | null = await Crypto.findOne({
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
	} else if(tgMessage){
		await userResponse.wrongCommand(
			tgMessage.chatId,
			'Unknown command\nTry again...'
		)
	}
	return res.send()
})
