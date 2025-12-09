import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface PaymentEvent {
  type: 'payment_received' | 'payment_failed' | 'payment_refunded';
  payment: any;
  timestamp: Date;
}

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/ws/payments',
})
export class PaymentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('PaymentsGateway');
  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    
    // Send initial connection success
    client.emit('connected', { message: 'Connected to payment stream' });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  broadcastPaymentEvent(event: PaymentEvent) {
    this.server.emit('payment_event', event);
    this.logger.debug(`Broadcasted ${event.type} to ${this.connectedClients.size} clients`);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}

