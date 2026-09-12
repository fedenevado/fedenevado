import { IsUUID } from "class-validator";

export class MarkPaidDto {
  @IsUUID("4")
  fromId!: string;

  @IsUUID("4")
  toId!: string;
}
