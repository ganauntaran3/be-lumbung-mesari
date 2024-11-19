import { Test, TestingModule } from '@nestjs/testing';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';

describe('DebtsController', () => {
  let debtsController: DebtsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DebtsController],
      providers: [DebtsService],
    }).compile();

    debtsController = app.get<DebtsController>(DebtsController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(debtsController.getDebts(1)).toEqual([
        { id: 1, userId: 1, amount: 500, dueDate: '2024-01-01' },
      ]);
    });
  });
});
