import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import configuration from "./config/configuration";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { MasterDataModule } from "./modules/master-data/master-data.module";
import { WarehousesModule } from "./modules/warehouses/warehouses.module";
import { ProductsModule } from "./modules/products/products.module";
import { StockModule } from "./modules/stock/stock.module";
import { StockTransfersModule } from "./modules/stock-transfers/stock-transfers.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { PurchasesModule } from "./modules/purchases/purchases.module";
import { SalesModule } from "./modules/sales/sales.module";
import { ReturnsModule } from "./modules/returns/returns.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ReportsModule } from "./modules/reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    MasterDataModule,
    WarehousesModule,
    ProductsModule,
    StockModule,
    StockTransfersModule,
    SuppliersModule,
    CustomersModule,
    PurchasesModule,
    SalesModule,
    ReturnsModule,
    PaymentsModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
