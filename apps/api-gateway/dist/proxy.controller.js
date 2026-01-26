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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyController = void 0;
const common_1 = require("@nestjs/common");
const proxy_service_1 = require("./proxy.service");
let ProxyController = class ProxyController {
    proxy;
    constructor(proxy) {
        this.proxy = proxy;
    }
    async handle(req, res) {
        try {
            const result = await this.proxy.forward(req);
            const headersToSet = {};
            if (result.headers['content-type'])
                headersToSet['content-type'] = result.headers['content-type'];
            if (result.headers['set-cookie'])
                headersToSet['set-cookie'] = result.headers['set-cookie'];
            res.set(headersToSet);
            res.status(result.status).send(result.data);
        }
        catch (err) {
            if (err.response) {
                res.status(err.response.status).send(err.response.data);
            }
            else if (err.status) {
                res.status(err.status).send({ message: err.message || 'Bad Gateway' });
            }
            else {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        }
    }
};
exports.ProxyController = ProxyController;
__decorate([
    (0, common_1.All)('auth'),
    (0, common_1.All)('auth/*path'),
    (0, common_1.All)('course'),
    (0, common_1.All)('course/*path'),
    (0, common_1.All)('learning'),
    (0, common_1.All)('learning/*path'),
    (0, common_1.All)('media'),
    (0, common_1.All)('media/*path'),
    (0, common_1.All)('quiz'),
    (0, common_1.All)('quiz/*path'),
    (0, common_1.All)('docs/*path'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProxyController.prototype, "handle", null);
exports.ProxyController = ProxyController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [proxy_service_1.ProxyService])
], ProxyController);
//# sourceMappingURL=proxy.controller.js.map