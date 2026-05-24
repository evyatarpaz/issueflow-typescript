import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketDependenciesController } from './ticket-dependencies.controller';
import { TicketsService } from '../tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AddDependencyDto } from './add-dependency.dto';

describe('TicketDependenciesController', () => {
  let controller: TicketDependenciesController;
  let service: TicketsService;

  const mockTicketsService = {
    addDependency: jest.fn(),
    getBlockedBy: jest.fn(),
    removeDependency: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketDependenciesController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TicketDependenciesController>(
      TicketDependenciesController,
    );
    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should add a dependency and return blockedBy tickets', async () => {
    const dto: AddDependencyDto = { blockedBy: 2 };
    const blockedBy = [{ id: 2 }];
    mockTicketsService.addDependency.mockResolvedValue(blockedBy);

    const result = await controller.addDependency(1, dto);

    expect(result).toBe(blockedBy);
    expect(service.addDependency).toHaveBeenCalledWith(1, dto);
  });

  it('should return blockedBy tickets', async () => {
    const blockedBy = [{ id: 2 }];
    mockTicketsService.getBlockedBy.mockResolvedValue(blockedBy);

    const result = await controller.getBlockedBy(1);

    expect(result).toBe(blockedBy);
    expect(service.getBlockedBy).toHaveBeenCalledWith(1);
  });

  it('should remove a dependency and return blockedBy tickets', async () => {
    const blockedBy = [{ id: 3 }];
    mockTicketsService.removeDependency.mockResolvedValue(blockedBy);

    const result = await controller.removeDependency(1, 2);

    expect(result).toBe(blockedBy);
    expect(service.removeDependency).toHaveBeenCalledWith(1, 2);
  });

  it('should use HTTP 200 for all dependency endpoints', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TicketDependenciesController.prototype.addDependency,
      ),
    ).toBe(200);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TicketDependenciesController.prototype.getBlockedBy,
      ),
    ).toBe(200);
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        TicketDependenciesController.prototype.removeDependency,
      ),
    ).toBe(200);
  });
});
