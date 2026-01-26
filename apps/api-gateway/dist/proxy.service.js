"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ProxyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let ProxyService = ProxyService_1 = class ProxyService {
    httpService;
    logger = new common_1.Logger(ProxyService_1.name);
    constructor(httpService) {
        this.httpService = httpService;
    }
    getServiceUrl(prefix) {
        const envName = `${prefix.toUpperCase()}_SERVICE_URL`;
        return process.env[envName];
    }
    async forward(req) {
        const svcList = 'auth|course|learning|media|quiz';
        const m1 = req.path.match(new RegExp(`^\/(${svcList})(\/.*|$)`));
        const m2 = req.path.match(new RegExp(`^\/docs\/(${svcList})(\/.*|$)`));
        let prefix;
        let tail;
        if (m1) {
            prefix = m1[1];
            tail = m1[2] || '/';
        }
        else if (m2) {
            prefix = m2[1];
            tail = `/docs/${prefix}` + (m2[2] || '');
        }
        else {
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
        const config = {
            method: req.method,
            url: target,
            headers,
            params: req.query,
            data: req.body,
            responseType: 'arraybuffer',
            validateStatus: () => true,
        };
        const resp = await (0, rxjs_1.lastValueFrom)(this.httpService.request(config));
        return { status: resp.status, headers: resp.headers, data: resp.data };
    }
};
exports.ProxyService = ProxyService;
exports.ProxyService = ProxyService = ProxyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], ProxyService);
//# sourceMappingURL=proxy.service.js.map