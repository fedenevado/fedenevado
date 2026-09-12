import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { PlanTypeDto } from "./create-plan.dto";

const PLAN_TYPES = ["viaje", "comida", "evento", "plan_casual"] as const;

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsIn(PLAN_TYPES)
  type?: PlanTypeDto;

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "time debe tener formato HH:mm" })
  time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  @Type(() => String)
  invitedFriendIds?: string[];
}
