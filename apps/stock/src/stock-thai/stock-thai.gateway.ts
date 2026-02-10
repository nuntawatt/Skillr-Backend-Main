import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { StockThaiService } from './stock-thai.service';

@WebSocketGateway({
    cors: { origin: '*' },
})
export class StockThaiGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly stockService: StockThaiService) { }

    onModuleInit() {
        // ดึงทุก 15 วินาที (เหมาะกับ ~80 ตัว)
        setInterval(async () => {
            const data = await this.stockService.fetchAllQuotes();
            this.server.emit('thai-stocks:update', data);
        }, 15_000);
    }
}
