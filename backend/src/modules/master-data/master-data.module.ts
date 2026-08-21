import { Module } from "@nestjs/common";
import { MasterDataService } from "./master-data.service";
import {
  CategoriesController,
  BrandsController,
  UnitsController,
} from "./master-data.controller";

@Module({
  controllers: [CategoriesController, BrandsController, UnitsController],
  providers: [MasterDataService],
})
export class MasterDataModule {}
