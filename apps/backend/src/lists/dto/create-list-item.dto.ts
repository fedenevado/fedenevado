import { IsNotEmpty, MaxLength } from "class-validator";

export class CreateListItemDto {
  @IsNotEmpty()
  @MaxLength(200)
  text!: string;
}
