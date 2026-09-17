import { IsBoolean } from "class-validator";

export class ReminderDoneDto {
  @IsBoolean()
  done!: boolean;
}
