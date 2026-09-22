import { IsString, MinLength } from "class-validator";

export class UsernameAvailabilityDto {
  @IsString()
  @MinLength(1)
  username!: string;
}
