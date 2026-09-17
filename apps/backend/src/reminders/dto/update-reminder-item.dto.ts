import { IsBoolean } from "class-validator";

export class UpdateReminderItemDto {
  @IsBoolean()
  done!: boolean;
}
