import type { ServerResponse } from 'node:http';
import type { RunSnapshot } from '../application/ports.js';

export class EventHub {
  private readonly clients = new Set<ServerResponse>();

  subscribe(response: ServerResponse): () => void {
    this.clients.add(response);
    return () => this.clients.delete(response);
  }

  publish(snapshot: RunSnapshot): void {
    const message = `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`;
    for (const client of this.clients) client.write(message);
  }

  heartbeat(): void {
    for (const client of this.clients) client.write(': heartbeat\n\n');
  }
}
