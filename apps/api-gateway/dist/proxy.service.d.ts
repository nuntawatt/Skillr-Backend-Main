import { HttpService } from '@nestjs/axios';
export declare class ProxyService {
    private readonly httpService;
    private readonly logger;
    constructor(httpService: HttpService);
    private getServiceUrl;
    forward(req: any): Promise<{
        status: number;
        headers: any;
        data: any;
    }>;
}
