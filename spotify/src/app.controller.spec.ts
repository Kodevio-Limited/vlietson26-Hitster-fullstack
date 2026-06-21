import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getApiInfo', () => {
    it('should return API metadata', () => {
      const info = appController.getApiInfo();
      expect(info).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          endpoints: expect.objectContaining({
            api: expect.any(String),
            health: expect.any(String),
          }),
        }),
      );
    });
  });
});
