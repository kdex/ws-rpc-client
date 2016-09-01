# ws-rpc-client
`ws-rpc-client` is a tiny WebSocket subprotocol that builds a request-response model onto HTML5 WebSockets using ES2015 Promises. You can use this with ES2016's `await`/`async` to simplify your WebSocket API. `ws-rpc-client` supports `node.js` and browsers. For more flexibility, have a look at [kdex/ws-promise-server](https://github.com/kdex/ws-promise-server) and [kdex/ws-promise-client](https://github.com/kdex/ws-promise-client).
## API reference
#### RPC.prototype.readMessage(text, fire = true)
Reads a serialized incoming message containing `text` and fires an event if `fire` is truthy. Reading a message means that the RPCClient may automatically reply with `MESSAGE_ACKNOWLEDGEMENT` so that the `Promise` on the other side resolves.
- text
	The serialized `Message` object to read
- fire
	If truthy, fires an event of `message.id`

#### RPC.prototype.send(payload)
Sends a message containing `payload` in order to execute a remote method
- payload.instruction
	The instruction to invoke on the remote target
- payload.args
	The arguments that should be provided
- payload.timeout
	The timeout that should be used for declaring the message transmission as failed. If not provided, the default timeout is used.
- payload.id
	A unique ID to tell messages apart; if not provided, a random UUID is used.