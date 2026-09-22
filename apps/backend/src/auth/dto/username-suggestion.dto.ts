import { IsString, MinLength } from "class-validator";

export class UsernameSuggestionDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
