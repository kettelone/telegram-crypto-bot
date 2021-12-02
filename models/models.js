import mongoose from 'mongoose'

const cryptoSchema = new mongoose.Schema({
    name: String,
    symbol: String,
    dateAdded: String,
    details: Object,
    userId: Number
  });
  
 const Crypto = mongoose.model('Crypto', cryptoSchema);
  
export {Crypto}