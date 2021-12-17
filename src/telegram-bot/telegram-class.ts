import dotenv from 'dotenv'
import axios from 'axios'
import { Crypto, ICrypto} from '../models/models.js'
import {
	COMMANDS,
	buttonAdd,
	buttonDelete,
} from './telegram-index.js'
import {CoinMarketResponse} from '../intrefaces/coinMarketResponse'
import {IUserResponse} from '../intrefaces/userResponse'
dotenv.config()

const urlCoinmarketcap: string = process.env.URL!
const coinMarketKey: string = process.env.COIN_MARKET_CAP_KEY!
const telegramEndpoint = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`


export class UserResponse implements IUserResponse {
	async start(chatId: number, name: string): Promise<void> {
		try {
			await axios.post(`${telegramEndpoint}/sendSticker`, {
				chat_id: chatId,
				sticker:
					'https://tlgrm.eu/_/stickers/b4d/bf5/b4dbf515-240d-34ee-8b31-e4bf61b25593/5.webp',
			})
		} catch (e) {
			console.log(e)
		}

		try {
			await axios.post(`${telegramEndpoint}/sendMessage`, {
				chat_id: chatId,
				text: `Welcome ${name}`,
			})
		} catch (e) {
			console.log(name)
		}
	}

	async help(chatId: number): Promise<void>{
		let helpText = ''
		helpText += COMMANDS.map(
			(command) =>
				`🔻/${command.command}\n      <u><b>${command.description}</b></u>`
		).join(`\n`)

		try {
			await axios.post(`${telegramEndpoint}/sendMessage`, {
				chat_id: chatId,
				text: helpText,
				parse_mode: 'HTML',
			})
		} catch (e) {
			console.log(e)
		}
	}

	async listRecent(chatId: number): Promise<void> {
		try {
			const recentList = await axios
				.get<CoinMarketResponse>(urlCoinmarketcap, {
					headers: { 'X-CMC_PRO_API_KEY': coinMarketKey },
				})
				.then(response => response.data.data)
				.then((data) => {
					let list = ''

					for (let k = 0; k < 25; k++) {
						list += `/${data[k].symbol} $${data[k].quote.USD.price.toFixed(
							4
						)}\n`
					}
					return list
				})

			await axios.post(`${telegramEndpoint}/sendMessage`, {
				chat_id: chatId,
				text: recentList,
				parse_mode: 'HTML',
			})
		} catch (e) {
			console.log(e)
		}
	}

	async detailedCoinInfo(coin: string): Promise<string | boolean>{
		const detailedInfo = await axios
			.get<CoinMarketResponse>(urlCoinmarketcap, {
				headers: { 'X-CMC_PRO_API_KEY': coinMarketKey },
			})
			.then((response) => response.data.data)
			.then((data) => {
				for (const el of data) {
					if (el.symbol === coin) {
						return el
					}
				}
				return false
			})
			.then((coinInfo) => {
				if (coinInfo) {
					let infoList = `💰<b>${coinInfo.symbol}</b>\n\n`

					Object.keys(coinInfo.quote.USD).forEach((key) => {
						infoList += `✅ <b>${key.toUpperCase()}</b>:\n       <u>${
							coinInfo.quote.USD[key]
						}</u>\n`
					})
					return infoList
				} else {
					return false
				}
			})
		return detailedInfo
	}

	async listFavourite(chatId: number, userId: number): Promise<void>{
		let cryptoList = ''
		try {
			const favouriteCrypto: Array<ICrypto>  = await Crypto.find({ userId: userId })

			favouriteCrypto.map(
				(el) =>
					(cryptoList += `/${el.symbol} $${el.details.price.toFixed(4)}\n`)
			)
		} catch (e) {
			console.log('Big error occured.......', e)
		}

		if (!cryptoList) {
			try {
				await axios.post(`${telegramEndpoint}/sendMessage`, {
					chat_id: chatId,
					text: `Your list is empty...`,
					parse_mode: 'HTML',
				})
			} catch (e) {
				console.log(e)
			}
		} else {
			try {
				await axios.post(`${telegramEndpoint}/sendMessage`, {
					chat_id: chatId,
					text: cryptoList,
					parse_mode: 'HTML',
				})
			} catch (e) {
				console.log(e)
			}
		}
	}

	async exist(chatId: number, userId: number, detailedCoinInfo: string, coin: string): Promise<void> {
		const coinExist: ICrypto | null = await Crypto.findOne({
			symbol: `${coin}`,
			userId: userId,
		})

		if (!coinExist) {
			try {
				await axios.post(`${telegramEndpoint}/sendMessage`, {
					chat_id: chatId,
					text: detailedCoinInfo,
					parse_mode: 'HTML',
					reply_markup: buttonAdd,
				})
			} catch (e) {
				console.log(e)
			}
		} else {
			try {
				await axios.post(`${telegramEndpoint}/sendMessage`, {
					chat_id: chatId,
					text: detailedCoinInfo,
					parse_mode: 'HTML',
					reply_markup: buttonDelete,
				})
			} catch (e) {
				console.log(e)
			}
		}
		// return
	}

	async addToFavourite(addCoin: string, userId: number, chatId: number): Promise<void> {
		const exist: ICrypto | null = await Crypto.findOne({
			symbol: `${addCoin}`,
			userId: userId,
		})

		if (!exist) {
			await axios
				.get<CoinMarketResponse>(urlCoinmarketcap, {
					headers: {
						'X-CMC_PRO_API_KEY': coinMarketKey,
					},
				})
				.then((response) => response.data.data)
				.then((data) => {
					for (const el of data) {
						if (el.symbol === addCoin) {
							return el
						}
					}
				})
				.then((coinToAdd) => {
					if(coinToAdd){
						try {
						const coinDocument: ICrypto = new Crypto({
							name: coinToAdd.name,
							symbol: coinToAdd.symbol,
							dateAdded: coinToAdd.date_added,
							details: coinToAdd.quote.USD,
							userId: userId,
						})

						coinDocument.save(function (err: any) {
							if (err) return console.error(err)
							console.log('Document inserted succussfully!')
						})
						return true
					} catch (e) {
						return false
					}
					}
				})
				.then((status) => {
					if (status) {
						axios.post(`${telegramEndpoint}/sendMessage`, {
							chat_id: chatId,
							text: `💰<b>${addCoin}</b> has been added to Favourite list`,
							parse_mode: 'HTML',
						})
					} else {
						axios.post(`${telegramEndpoint}/sendMessage`, {
							chat_id: chatId,
							text: `Invalid coin name...`,
							parse_mode: 'HTML',
						})
					}
				})
		} else {
			await axios.post(`${telegramEndpoint}/sendMessage`, {
				chat_id: chatId,
				text: `💰<b>${addCoin}</b> is already in your Favourite list`,
				parse_mode: 'HTML',
			})
		}
	}

	async removeFromFavourite(deleteCoin: string, userId: number, chatId: number): Promise<void>{
		try {
			Crypto.deleteOne(
				{ symbol: `${deleteCoin}`, userId: userId },
				function (err:Error) {
					if (err) {
						console.log(err)
					}
				}
			)
		} catch (e) {
			console.log(e)
		}

		try {
			await axios.post(`${telegramEndpoint}/sendMessage`, {
				chat_id: chatId,
				text: `💰<b>${deleteCoin}</b> has been removed from Favourite list`,
				parse_mode: 'HTML',
			})
		} catch (e) {
			console.log(e)
		}
	}

	async wrongCommand(chatId: number, text: string): Promise<void> {
		try {
			await axios.post(`${telegramEndpoint}/sendMessage`, {
				chat_id: chatId,
				text: `${text}`,
				parse_mode: 'HTML',
			})
		} catch (e) {
			console.log(e)
		}
	}
}
