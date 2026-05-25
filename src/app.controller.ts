import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root HTTP controller acting as an unauthenticated liveness probe.
 * Exposes a simple check for external load balancers and orchestrators (like Kubernetes)
 * to verify the application container is responsive.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
