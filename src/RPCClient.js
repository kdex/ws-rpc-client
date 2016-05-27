import EventEmitter from "crystal-event-emitter";
const extensions = Symbol("[[Extensions]]");
const MESSAGE_REPLY = 0;
const MESSAGE_ACKNOWLEDGEMENT = 1;
class Message {
	static currentID = 0;
	constructor(payload, id) {
		this.id = id !== undefined ? id : Message.currentID++;
		this.payload = payload;
	}
}
function cancel(resolver, time = 0) {
	return new Promise(async (resolve, reject) => {
		let timeout = false;
		const timeoutError = new Error("The promise has timed out.");
		const timer = setTimeout(() => {
			timeout = true;
			reject(timeoutError);
		}, time);
		try {
			const result = await new Promise(resolver);
			if (!timeout) {
				clearTimeout(timer);
				resolve(result);
			}
			else {
				reject(timeoutError);
			}
		}
		catch (error) {
			if (!timeout) {
				clearTimeout(timer);
				reject(error);
			}
			else {
				reject(timeoutError);
			}
		};
	});
}
export class RPCClient extends EventEmitter {
	constructor(socket, options = {
		timeout: 1000
	}) {
		super({
			inferListeners: true
		});
		this[extensions] = options;
		this[extensions].socket = socket;
		for (let event of ["close", "error", "message", "open"]) {
			let name = `on${event}`;
			this[extensions].socket[name] = e => {
				if (event === "message") {
					if (JSON.parse(e.data).payload.instruction === MESSAGE_ACKNOWLEDGEMENT) {
						return;
					}
					this.emit(event, {
						originalEvent: e,
						data: e.data
					});
				}
				else {
					this.emit(event, {
						originalEvent: e
					});
				}
			};
		}
	}
	createMessage({
		instruction = MESSAGE_ACKNOWLEDGEMENT,
		args = [],
		id
	} = {}) {
		return new Message({
			instruction,
			args
		}, id);
	}
	readMessage(text, fire = true) {
		const messageData = JSON.parse(text);
		const message = new Message(messageData.payload, messageData.id);
		message.reply = async (...args) => {
			let newInstruction = MESSAGE_REPLY;
			if (message.payload.instruction === newInstruction) {
				newInstruction = MESSAGE_ACKNOWLEDGEMENT;
			}
			return await this.send(newInstruction, message.id, ...args);
		};
		if (fire) {
			this.emit(message.id, message);
		}
		if (message.id !== message.payload.instruction) {
			if (message.payload.instruction !== MESSAGE_ACKNOWLEDGEMENT && message.payload.instruction !== MESSAGE_REPLY) {
				this.emit(message.payload.instruction, message);
			}
		}
		return message;
	}
	async send(instruction, id, ...args) {
		const message = this.createMessage({
			instruction,
			args,
			id
		});
		console.log(message);
		try {
			if (message.payload.instruction === MESSAGE_ACKNOWLEDGEMENT || message.payload.instruction === MESSAGE_REPLY) {
				/* Reply to a reply */
				const serialization = JSON.stringify(message);
				this[extensions].socket.send(serialization);
				return null;
			}
			const response = await cancel((resolve, reject) => {
				const listener = (...args) => {
					this.off(message.id, listener);
					resolve(...args);
					const reply = args[0];
					reply.reply();
// 					const replyListener = () => {
// 						resolve();
// 						this.off(message.id, replyListener);
// 					};
// 					this.on(message.id, replyListener);
				};
				this.on(message.id, listener);;
				const serialization = JSON.stringify(message);
				this[extensions].socket.send(serialization);
			}, this[extensions].timeout);
			return response;
		}
		catch (e) {
			throw new Error(`Timeout: Failed to send message ${JSON.stringify(message)}.`);
		}
	}
};
export default RPCClient;