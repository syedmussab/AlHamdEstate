import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, StockMovementType } from "../../generated/prisma/client";

export interface StockMovementInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  type: StockMovementType;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  userId?: string | null;
}

@Injectable()
export class StockService {
  /**
   * Applies a stock movement within an active transaction and keeps the
   * Stock ledger (product x warehouse) in sync. Every stock change MUST go
   * through this method so the movement history is always complete.
   */
  async applyMovement(tx: Prisma.TransactionClient, input: StockMovementInput) {
    const key = { productId: input.productId, warehouseId: input.warehouseId };
    const current = await tx.stock.findUnique({ where: { productId_warehouseId: key } });

    const currentQty = current?.quantity ?? 0;
    const newQty = currentQty + input.quantity;

    if (newQty < 0) {
      throw new ConflictException(
        `Insufficient stock for product ${input.productId} in warehouse ${input.warehouseId} (available: ${currentQty}, requested: ${Math.abs(input.quantity)})`
      );
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        quantity: input.quantity,
        type: input.type,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        userId: input.userId ?? null,
      },
    });

    if (current) {
      await tx.stock.update({ where: { productId_warehouseId: key }, data: { quantity: newQty } });
    } else {
      await tx.stock.create({
        data: { ...key, quantity: input.quantity },
      });
    }

    return movement;
  }

  /**
   * Reads the effective stock quantity for a product/warehouse combination.
   */
  async getQuantity(tx: Prisma.TransactionClient, productId: string, warehouseId: string) {
    const stock = await tx.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
    return stock?.quantity ?? 0;
  }
}
