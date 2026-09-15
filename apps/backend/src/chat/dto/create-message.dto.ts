import { IsNotEmpty, MaxLength } from "class-validator";

export class CreateMessageDto {
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
