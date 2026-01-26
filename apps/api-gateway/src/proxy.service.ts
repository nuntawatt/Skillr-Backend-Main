import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

/*
  ProxyService
  - Maps path prefixes to downstream service URLs via environment variables.
  - Forwards method, headers, query params and body using Axios (via HttpService).
  - Returns downstream response status, headers and data to the controller.
*/
@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {}

  private getServiceUrl(prefix: string): string | undefined {
    const envName = `${prefix.toUpperCase()}_SERVICE_URL`;
    return process.env[envName];
  }

  async forward(req: any): Promise<{ status: number; headers: any; data: any }> {
    const svcList = 'auth|course|learning|media|quiz';
    const m1 = req.path.match(new RegExp(`^\/(${svcList})(\/.*|$)`));
    const m2 = req.path.match(new RegExp(`^\/docs\/(${svcList})(\/.*|$)`));

    let prefix: string | undefined;
    let tail: string;

    if (m1) {
      prefix = m1[1];
      tail = m1[2] || '/';
    } else if (m2) {
      prefix = m2[1];
      // forward docs requests to the service's /docs/{service}... path
      // preserve the service segment so requests like /docs/auth -> /docs/auth on downstream
      tail = `/docs/${prefix}` + (m2[2] || '');
    } else {
      throw { status: 502, message: 'Unknown service prefix' };
    }

    if (!prefix) {
      throw { status: 502, message: 'Unknown service prefix' };
    }

    const serviceUrl = this.getServiceUrl(prefix);
    if (!serviceUrl) {
      throw { status: 502, message: `Service URL for ${prefix} not configured` };
    }

    const target = serviceUrl.replace(/\/$/, '') + (tail === '' ? '/' : tail);
    this.logger.debug(`m1=${JSON.stringify(m1)} m2=${JSON.stringify(m2)} prefix=${prefix} tail=${tail}`);
    this.logger.log(`${req.method} ${req.originalUrl} -> ${target}`);

    const headers = { ...(req.headers || {}) };
    delete headers.host;

    const config: AxiosRequestConfig = {
      method: req.method,
      url: target,
      headers,
      params: req.query,
      data: req.body,
      responseType: 'arraybuffer',
      validateStatus: () => true,
    };

    const resp = await lastValueFrom(this.httpService.request(config));
    return { status: resp.status, headers: resp.headers, data: resp.data };
  }
}
