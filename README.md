# Project moved
This project has moved [here](https://github.com/kdex/ws-promise). This repository is deprecated.

# ws-rpc-client
`ws-rpc-client` is a tiny WebSocket subprotocol that builds a request-response model onto HTML5 WebSockets using ES2015 Promises. You can use this with ES2017's `await`/`async` to simplify your WebSocket API. `ws-rpc-client` supports `node.js` and browsers. For more flexibility, please see [kdex/ws-promise-server](https://github.com/kdex/ws-promise-server) and [kdex/ws-promise-client](https://github.com/kdex/ws-promise-client), the official server and client based on this subprotocol.
## API reference
#### RPC.constructor(options)
Constructs a new RPC client. `options` is an optional object with the following properties:
- `options.timeout`
	A global timeout (in milliseconds) after which the delivery of a message is considered to have failed. By default, a value of 1500 is assumed.

#### RPC.prototype.readMessage(text, fire = true)
Reads a serialized incoming message containing `text` and fires a specialized event if `fire` is truthy. Reading a message means that the RPCClient may automatically reply with `MESSAGE_ACKNOWLEDGEMENT` so that the `Promise` on the other side resolves.
- `text`
	The serialized `Message` object to read
- `fire`
	(optional) If truthy, fires an event of `message.id`

#### async RPC.prototype.send(payload)
Sends a message containing `payload` in order to execute a remote method. `payload` takes the following form:
- `payload.instruction`
	The instruction name to invoke on the remote target
- `payload.args`
	An array of arguments that should be provided. If you don't pass an array, the argument will be wrapped in one.
- `payload.timeout`
	(optional) The timeout that should be used for declaring the message transmission as failed. If not provided, the default timeout is used.
- `payload.id`
	(optional) A unique ID to tell messages apart; if not provided, a random UUID is used.