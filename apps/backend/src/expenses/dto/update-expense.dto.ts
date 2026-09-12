import { ArrayNotEmpty, ArrayUnique, IsArray, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, MaxLength } from "class-validator";

export class UpdateExpenseDto {
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsUUID("4")
  paidBy?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  splitWith?: string[];
}
