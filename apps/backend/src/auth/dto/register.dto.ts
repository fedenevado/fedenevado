import { IsEmail, IsString, Matches, MinLength } from "class-validator";
import { USERNAME_REGEX } from "../username.util";

export class RegisterDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @Matches(USERNAME_REGEX, {
    message: "El nombre de usuario solo puede tener minúsculas, números, puntos y guiones bajos (3-20 caracteres).",
  })
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
