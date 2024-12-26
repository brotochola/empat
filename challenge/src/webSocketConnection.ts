export class WebSocketConnection {
  socket: WebSocket;
  lastMessage: Object = {};
  callback: Function;
  constructor(
    private url: string = "ws://localhost:8080",
    callback: Function,
    onFail: Function
  ) {
    this.socket = new WebSocket(url);

    this.socket.onerror = () => onFail();

    this.socket.onmessage = (event: MessageEvent) => {
      this.lastMessage = JSON.parse(event.data);
      callback(this.lastMessage);
    };
  }
}
