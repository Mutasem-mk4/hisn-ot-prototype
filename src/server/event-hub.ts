import type { ServerResponse } from 'node:http';
import type { RunSnapshot } from '../application/ports.js';

export class EventHub {
  private readonly clients = new Set<ServerResponse>();

  subscribe(response: ServerResponse): () => void {
    if (this.clients.size >= 100) {
      response.end();
      return () => undefined;
    }
    this.clients.add(response);
    return () => this.clients.delete(response);
  }

  publish(snapshot: RunSnapshot): void {
    const message = `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`;
    for (const client of this.clients) {
      if (client.destroyed || !client.write(message)) {
        client.end();
        this.clients.delete(client);
      }
    }
  }

  heartbeat(): void {
    for (const client of this.clients) client.write(': heartbeat\n\n');
  }
}
