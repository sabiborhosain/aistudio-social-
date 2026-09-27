type SocketCallback = (data: any) => void;

class RealtimeSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<SocketCallback>> = new Map();
  private reconnectTimer: any = null;
  private isConnecting = false;
  private currentToken: string | null = null;

  public connect(token?: string | null) {
    if (this.isConnecting) return;
    const authToken = token || localStorage.getItem('devsphere_token');
    this.currentToken = authToken;

    if (!authToken) {
      this.disconnect();
      return;
    }

    try {
      this.isConnecting = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(authToken)}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        // Send explicit auth message as well
        this.send('auth', { token: authToken });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: eventName, data } = payload;
          if (eventName && this.listeners.has(eventName)) {
            this.listeners.get(eventName)!.forEach(cb => {
              try {
                cb(data);
              } catch (e) {
                console.error(`[WebSocket] Error in listener for ${eventName}:`, e);
              }
            });
          }
        } catch (err) {
          console.error('[WebSocket] Failed parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnecting = false;
        console.warn('[WebSocket] Connection error:', err);
        this.ws?.close();
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (!this.currentToken) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.currentToken);
    }, 4000);
  }

  public on(event: string, callback: SocketCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public send(event: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const socketService = new RealtimeSocket();
