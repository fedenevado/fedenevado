import { IsNotEmpty, MaxLength } from "class-validator";

export class CreateReminderItemDto {
  @IsNotEmpty()
  @MaxLength(200)
  text!: string;
}
