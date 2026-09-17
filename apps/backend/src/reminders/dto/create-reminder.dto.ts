import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsDateString({ strict: true })
  date!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "time debe tener formato HH:mm" })
  time?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  @Type(() => String)
  sharedWith?: string[];

  // Elementos iniciales del checklist (opcional). Modificar el checklist
  // después de creado usa los endpoints de items, no este DTO.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  items?: string[];
}
