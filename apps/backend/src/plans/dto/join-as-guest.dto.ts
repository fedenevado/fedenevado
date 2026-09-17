import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class JoinAsGuestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  guestName!: string;
}
