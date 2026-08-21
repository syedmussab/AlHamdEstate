import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min, Max } from "class-validator";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "desc";

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginate<T>(data: T[], total: number, dto: PaginationDto): PaginatedResult<T> {
  const totalPages = Math.ceil(total / dto.limit);
  return {
    data,
    meta: {
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages,
    },
  };
}
