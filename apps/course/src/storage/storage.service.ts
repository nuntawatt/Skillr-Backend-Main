import { Injectable } from '@nestjs/common';
import { StorageFactory } from './storage.factory';
import { StorageProvider } from './storage.interface';

@Injectable()
export class StorageService {
  constructor(private readonly factory: StorageFactory) {}

  image(): StorageProvider {
    return this.factory.image();
  }

  video(): StorageProvider {
    return this.factory.video();
  }
}
