import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
export declare class ProxyController {
    private readonly proxy;
    constructor(proxy: ProxyService);
    handle(req: Request, res: Response): Promise<void>;
}
