import dotenv from 'dotenv'
dotenv.config();
import axios from 'axios'
import express from 'express'
import mongoose from 'mongoose'
import TelegramApi from 'node-telegram-bot-api'
import {COMMANDS, buttonAdd, buttonDelete} from "./telegram-bot/telegram-index.js"
import {Crypto} from './models/models.js'

const app = express()
const PORT = process.env.PORT || 3000
const urlCoinmarketcap = process.env.URL

app.listen(PORT, ()=>{
  console.log(`Server has been started on port ${PORT}`)
})

let coin,
    coinSymbols = [],
    coinNames = [];


//receive a response from Cryptocurrency API
const getCryptoData = async() =>{
  await axios.get(urlCoinmarketcap, {
    headers: {'X-CMC_PRO_API_KEY': process.env.COIN_MARKET_CAP_KEY},
  }).then(function (response){

   coin = response.data.data

  }).catch(error => console.log(error))

    return coin
}

//create arrays of currency symbols and names
getCryptoData()
  .then((data) => {data.forEach(el =>{
      coinSymbols.push(el.symbol)
      coinNames.push(el.name)
    })
  })

   //Connect to DB
   const startDB = async() => {

      try{
        mongoose.connect(process.env.DB_CONN_STRING)
        let db = mongoose.connection
    
        db.on("error", console.error.bind(console, "connection error:"));
    
        db.once("open", function() {
          console.log("Connection Successful!");
        });
    
      }catch(e){
        console.log("Connection to DB failed",e)
      }

   }

   startDB()

//Create telergam bot
const bot = new TelegramApi(process.env.TELEGRAM_TOKEN, {polling: true})



bot.on('message', async msg => {
    let text = msg.text,
        chatId = msg.chat.id,
        userId = msg.from.id
        
  try{
  // /start command
    if(text === '/start'){
      await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/b4d/bf5/b4dbf515-240d-34ee-8b31-e4bf61b25593/5.webp')
      await bot.sendMessage(chatId, `Welcome ${msg.chat.first_name}`)
      return
  }

  // /help command
  if(text === '/help'){
      let helpText = ''
      helpText += COMMANDS.map(
        (command) => `🔻/${command.command}\n      <u><b>${command.description}</b></u>`
      ).join(`\n`);

      return await bot.sendMessage(chatId, helpText, {parse_mode: 'HTML'})
  }
  
  // /list recent command
  if(text === '/list_recent'){
    let cryptoHype = ''
    for(let k = 0; k < 20; k ++){
      cryptoHype += `/${coin[k].symbol} $${coin[k].quote.USD.price.toFixed(4)}\n`
    }
    
     return await bot.sendMessage(chatId, cryptoHype)
  }

  // /{currency_name} command 
    if(coinNames.includes(text.substring(1))){

      let detailedInfo = `💰<b>${text.substring(1)}</b>\n\n`;  
      coin.forEach(el => {
        if(el.name == text.substring(1)){
          Object.keys(el.quote.USD).forEach(key => {
            detailedInfo += `✅ <b>${key.toUpperCase()}</b>:\n       <u>${el.quote.USD[key]}</u>\n`
          });
          return detailedInfo
        }
      })  

      let exist = async() => { 
        return await Crypto.findOne({name: `${text.substring(1)}`, userId: userId});
      }
      exist().then(data =>{
        if(data == null){
          return  bot.sendMessage(chatId, detailedInfo , buttonAdd)
        }else{
          return  bot.sendMessage(chatId, detailedInfo, buttonDelete)
        }
      })
    }

    // /addToFavorite {currency_name} command
    if(text.includes('addToFavourite')){
      let startIndex = text.indexOf(' ')//whitespace
      let addCoin = text.substring(startIndex).trim()

      if(addCoin === '/addToFavourite'){
        return bot.sendMessage(chatId, `Please specify coin name`, {parse_mode: 'HTML'})
      }
     
      let exist = async() => { 
        return await Crypto.findOne({name: `${addCoin}`, userId: userId});
      }

      exist().then(data =>{
        if(data == null){

          Object.keys(coin).forEach(key => {
            if(coin[key].name === addCoin){
              addToFavourite = coin[key]
            }
          });
          
          let coinDocument = new Crypto(
            {
            name: addToFavourite.name,
            symbol: addToFavourite.symbol, 
            dateAdded: addToFavourite.date_added,
            details: addToFavourite.quote.USD,
            userId: userId
          }
            ) 
          
           coinDocument.save(function(err, doc) {
            if (err) return console.error(err);
            console.log("Document inserted succussfully!");
          });

          return bot.sendMessage(chatId, `💰<b>${addCoin}</b> has been added to Favourite list`, {parse_mode: 'HTML'})
        }else{
          return bot.sendMessage(chatId, `💰<b>${addCoin}</b> is already in your Favourite list`, {parse_mode: 'HTML'})
        }
      })
    }
    
    // /list favourite command
    if(text === '/list_favourite'){

      let cryptoList = ''
      let favouriteCrypto = await Crypto.find({userId: userId});

      favouriteCrypto.map(el => cryptoList += `/${el.symbol} $${el.details.price.toFixed(4)}\n`)

      if(!cryptoList){
       return bot.sendMessage(chatId, 'Your list is empty...')
      }else{
        return bot.sendMessage(chatId, cryptoList)
      }
    }

    // /delete favourite
    if(text.includes('deleteFavourite')){
      let startIndex = text.indexOf(' ')
      let deleteCoin = text.substring(startIndex).trim()
      
      let exist = async() => { 
        return await Crypto.findOne({name: `${deleteCoin}`, userId: userId});
      }
 
      exist().then(data =>{
        if(deleteCoin == '/deleteFavourite'){
          return bot.sendMessage(chatId, `Please specify coin name`,{parse_mode: 'HTML'})
        }else if(data == null){

          return bot.sendMessage(chatId, `💰<b>${deleteCoin}</b> is not in your Favourite list`, {parse_mode: 'HTML'})

        }else{

        Crypto.findOneAndDelete({name: `${deleteCoin}`, userId: userId}, function (err, docs) {
            if (err){
                console.log(err)
            }
            else{
             return  bot.sendMessage(chatId, `💰<b>${deleteCoin}</b> has been deleted from Favourite`,{parse_mode: 'HTML'})
            }})
        }
      })
    }

  //detailed info by currency symbol command
  if(coinSymbols.includes(text.substring(1))){

    let detailedInfo = ``;

    coin.forEach(el => {
      if(el.symbol == text.substring(1)){
        detailedInfo = `💰 <u><b>${el.name}</b></u>\n\n`
        Object.keys(el.quote.USD).forEach(key => {
          detailedInfo += `✅ <b>${key.toUpperCase()}</b>:\n       <u>${el.quote.USD[key]}</u>\n`
        });

        return detailedInfo
      }
    })

    return await bot.sendMessage(chatId, detailedInfo, {parse_mode: 'HTML'})
    }
 }catch(e){
  console.log(e)
 }
})

//callback query when inline button is presssed
bot.on('callback_query', async msg =>{
 const data = msg.data,
      chatId  = msg.message.chat.id,
      text = msg.message.text,
      userId = msg.from.id


 if(data === 'ADD TO FAVOURITE'){
      let addCoin = text.substring(2, text.indexOf('\n')),
          addToFavourite

     let exist = async() => { 
        return await Crypto.findOne({name: addCoin, userId: userId});
      }
      exist().then(data =>{
        if(data == null){
         
          Object.keys(coin).forEach(key => {
            if(coin[key].name === addCoin){
              addToFavourite = coin[key]
            }
          });
          let coinDocument = new Crypto(
            {
            name: addToFavourite.name,
            symbol: addToFavourite.symbol, 
            dateAdded: addToFavourite.date_added,
            details: addToFavourite.quote.USD,
            userId: userId
          }
            ) 
          
           coinDocument.save(function(err, doc) {
            if (err) return console.error(err);
            console.log("Document inserted succussfully!");
          });
          
            bot.sendMessage(chatId, `💰<b>${addCoin}</b> has been added`, {parse_mode: 'HTML'})

        }else{
          return  bot.sendMessage(chatId, `💰<b>${addCoin}</b> is already in your list`, {parse_mode: 'HTML'})
        }
      })

  }else if(data === 'REMOVE FROM FAVOURITE'){
  
   const removeCoin = text.substring(2, text.indexOf('\n'))

   async function deleteFavourite(){
    try{
      Crypto.deleteOne({name: `${removeCoin}`, userId:userId}, function (err, docs) {
       if (err){
           console.log(err)  
       }
       else{
           return bot.sendMessage(chatId, `💰<b>${removeCoin}</b> has been deleted`, {parse_mode: 'HTML'})
       }
   })
    }catch(e){
     console.log(e)
    }
   }
   deleteFavourite()
}})

