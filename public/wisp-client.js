class WispClient {
    constructor(url = '/wisp/') {
        this.url = url;
        this.socket = null;
        this.connected = false;
        this.messageHandlers = [];
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = new WebSocket(this.url);
                
                this.socket.onopen = () => {
                    this.connected = true;
                    resolve();
                };
                
                this.socket.onerror = (error) => {
                    reject(error);
                };
                
                this.socket.onclose = () => {
                    this.connected = false;
                };
                
                this.socket.onmessage = (event) => {
                    this.messageHandlers.forEach(handler => handler(event.data));
                };
            } catch (error) {
                reject(error);
            }
        });
    }
    
    send(data) {
        if (!this.connected) throw new Error('Wisp not connected');
        this.socket.send(data);
    }
    
    onMessage(callback) {
        this.messageHandlers.push(callback);
    }
    
    close() {
        if (this.socket) this.socket.close();
    }
}

const wisp = new WispClient();