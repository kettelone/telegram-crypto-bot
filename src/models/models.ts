import mongoose,{Schema, Model, Document} from 'mongoose';

interface CoinDetails {
  [index: string]: number;
  price: number;
}

interface ICrypto extends Document {
  name: string;
  symbol: string;
  dateAdded: string;
  details: CoinDetails;
  userId: number;
}


const cryptoSchema: Schema = new mongoose.Schema({
  name: String,
  symbol: String,
  dateAdded: String,
  details: Object,
  userId: Number,
});

const Crypto: Model<ICrypto> = mongoose.model("Crypto", cryptoSchema);

export { Crypto , ICrypto};
