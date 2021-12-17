
interface RequestType {
	body : {
		callback_query :{
			data: string;
			message: { text: string; chat: { id: number; } }
			from: { id: number; }
		};
		message: {
			from :{ first_name: string; id: number;};
			chat: { id: number; };
			text: string;
			sticker?: object;
		}
	}
}

export {RequestType}