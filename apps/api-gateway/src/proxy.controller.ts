import { Controller, All, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

/*
  ProxyController
  - Declares wildcard routes for each downstream service prefix.
  - Uses a single handler to forward requests and pipe responses back to the client.
*/
@Controller()
export class ProxyController {
  constructor(private readonly proxy: ProxyService) {}

  // Map both the prefix root and a named wildcard to avoid legacy path warnings
  @All('auth')
  @All('auth/*path')
  @All('course')
  @All('course/*path')
  @All('learning')
  @All('learning/*path')
  @All('media')
  @All('media/*path')
  @All('quiz')
  @All('quiz/*path')
  @All('docs/*path')
  async handle(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.proxy.forward(req);

      // Forward important headers (content-type + set-cookie if present)
      const headersToSet: any = {};
      if (result.headers['content-type']) headersToSet['content-type'] = result.headers['content-type'];
      if (result.headers['set-cookie']) headersToSet['set-cookie'] = result.headers['set-cookie'];

      res.set(headersToSet);
      res.status(result.status).send(result.data);
    } catch (err: any) {
      if (err.response) {
        res.status(err.response.status).send(err.response.data);
      } else if (err.status) {
        res.status(err.status).send({ message: err.message || 'Bad Gateway' });
      } else {
        res.status(500).send({ message: 'Internal Server Error' });
      }
    }
  }
}
