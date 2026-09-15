import { IsBoolean } from "class-validator";

export class UpdateListItemDto {
  @IsBoolean()
  done!: boolean;
}
