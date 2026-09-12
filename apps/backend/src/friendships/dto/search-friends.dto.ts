import { IsString, MinLength } from "class-validator";

export class SearchFriendsDto {
  @IsString()
  @MinLength(1)
  q!: string;
}
