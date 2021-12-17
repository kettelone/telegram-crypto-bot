interface IUserResponse {
	start(chatId: number, name: string): void;
	help(chatId: number): void;
	listRecent(chatId: number):void;
	detailedCoinInfo(coin: string): Promise<string | boolean>;
	listFavourite(chatId: number, userId: number): void;
	exist(chatId: number, userId: number, detailedCoinInfo: string, coin: string): void;
	addToFavourite(addCoin: string, userId: number, chatId: number):void;
	removeFromFavourite(deleteCoin: string, userId: number, chatId: number): void;
	wrongCommand(chatId: number, text: string): void;
}

export {IUserResponse}