import { Controller, Get, HttpCode, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { FindAuditLogDto } from './dto/find-audit-log.dto';
import {
  AuditAction,
  AuditActor,
  AuditEntityType,
} from './entities/audit-log.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get audit logs with optional filters' })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: AuditEntityType,
    description: 'Filter by the audited entity type',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    type: Number,
    description: 'Filter by the audited entity ID',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AuditAction,
    description: 'Filter by the audit action',
  })
  @ApiQuery({
    name: 'actor',
    required: false,
    enum: AuditActor,
    description: 'Filter by the actor type',
  })
  @ApiResponse({ status: 200, description: 'Audit logs fetched successfully' })
  findAll(@Query() query: FindAuditLogDto) {
    return this.auditLogsService.findAll(query);
  }
}
