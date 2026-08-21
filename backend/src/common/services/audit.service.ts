import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: input.oldValue === undefined ? undefined : (input.oldValue as object),
        newValue: input.newValue === undefined ? undefined : (input.newValue as object),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
