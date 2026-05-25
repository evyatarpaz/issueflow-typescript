import { Injectable } from '@nestjs/common';

/**
 * Fundamental service provider for the root module.
 * Currently tasked with supplying the liveness probe response string.
 */
@Injectable()
export class AppService {
  getHello(): string {
    return 'IssueFlow is running!';
  }
}
