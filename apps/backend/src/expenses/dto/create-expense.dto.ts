import { ArrayNotEmpty, ArrayUnique, IsArray, IsNotEmpty, IsNumber, IsUUID, Min, MaxLength } from "class-validator";

export class CreateExpenseDto {
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsUUID("4")
  paidBy!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  splitWith!: string[];
}
