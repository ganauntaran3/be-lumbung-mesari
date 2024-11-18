import { Controller, Get } from '@nestjs/common';
import { DebtsService } from './debts.service';

@Controller()
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  getHello(): string {
    return this.debtsService.getHello();
  }
}
