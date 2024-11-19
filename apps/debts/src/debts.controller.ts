import { Controller, Get, Query } from '@nestjs/common';
import { DebtsService } from './debts.service';

@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  // @Get()
  // getHello(): string {
  //   return this.debtsService.getHello();
  // }

  @Get()
  getDebts(@Query('userId') userId: number) {
    return [
      { id: 1, userId: 1, amount: 500, dueDate: '2024-01-01' },
      { id: 2, userId: 2, amount: 300, dueDate: '2024-02-01' },
    ].filter((debt) => debt.userId === userId);
  }
}
