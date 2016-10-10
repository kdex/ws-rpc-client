import EventEmitter, { ANY } from "crystal-event-emitter";
export { ANY };
import uuid from "uuid";
export const MESSAGE_REPLY = 0;
export const MESSAGE_ACKNOWLEDGEMENT = 1;
const extensions = Symbol("[[Extensions]]");
class Message {
	static currentID = uuid.v4();
	constructor(payload, id) {
		this.id = id !== undefined ? id : Message.currentID;
		Message.currentID = uuid.v4();
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
		timeout: 1500
	}) {
		super({
			inferListeners: true
		});
		this[extensions] = options;
		this.rawSocket = socket;
		for (const event of ["close", "error", "message", "open"]) {
			const name = `on${event}`;
			this.rawSocket[name] = e => {
				if (event === "message") {
					if (JSON.parse(e.data).payload.instruction === MESSAGE_ACKNOWLEDGEMENT) {
						return;
					}
					/* Emit specialized event by reading message */
					const message = this.readMessage(e.data);
					/* Emit raw event */
					this.emit(event, {
						data: message,
						originalEvent: e,
						raw: true
					});
				}
				else {
					this.emit(event, e);
				}
			};
		}
	}
	createMessage({
		instruction = MESSAGE_ACKNOWLEDGEMENT,
		args = [],
		id
	} = {}) {
		/* The argument list should always be iterable */
		let argumentList = args;
		if (!Array.isArray(args)) {
			argumentList = [args];
		}
		return new Message({
			instruction,
			args: argumentList
		}, id);
	}
	readMessage(text, fire = true) {
		const messageData = JSON.parse(text);
		const message = new Message(messageData.payload, messageData.id);
		const instruction = message.payload.instruction;
		message.reply = async (...args) => {
			let newInstruction = MESSAGE_REPLY;
			if (instruction === newInstruction) {
				newInstruction = MESSAGE_ACKNOWLEDGEMENT;
			}
			if (instruction === MESSAGE_ACKNOWLEDGEMENT) {
				/* Acknowledgement messages should not trigger further traffic */
				return null;
			}
			return await this.send({
				args,
				id: message.id,
				instruction: newInstruction,
				timeout: this[extensions].timeout
			});
		};
		if (fire) {
			this.emit(message.id, {
				data: message
			});
		}
		return message;
	}
	async send({
		args,
		id,
		instruction,
		timeout = this[extensions].timeout
	} = {}) {
		const message = this.createMessage({
			instruction,
			args,
			id
		});
		try {
			if (message.payload.instruction === MESSAGE_ACKNOWLEDGEMENT || message.payload.instruction === MESSAGE_REPLY) {
				/* Reply to a reply */
				const serialization = JSON.stringify(message);
				this.rawSocket.send(serialization);
				return null;
			}
			const response = await cancel((resolve, reject) => {
				const listener = (...args) => {
					this.off(message.id, listener);
					resolve(...args);
					const [reply] = args;
					reply.reply();
				};
				this.on(message.id, listener);
				const serialization = JSON.stringify(message);
				this.rawSocket.send(serialization);
			}, timeout);
			return response;
		}
		catch (e) {
			throw new Error(`Timeout: Failed to send message ${JSON.stringify(message)}.`);
		}
	}
}
export default RPCClient;