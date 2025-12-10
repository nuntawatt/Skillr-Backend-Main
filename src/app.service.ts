import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHome_api(): string {
    return 'Welcome My World Skillr Course!';
  }
}
