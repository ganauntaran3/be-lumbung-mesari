import { Injectable } from '@nestjs/common';

@Injectable()
export class DebtsService {
  getHello(): string {
    return 'Hello World!';
  }
}
