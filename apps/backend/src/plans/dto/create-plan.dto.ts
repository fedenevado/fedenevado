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

const PLAN_TYPES = ["viaje", "comida", "evento", "plan_casual"] as const;
export type PlanTypeDto = (typeof PLAN_TYPES)[number];

const PLAN_VISIBILITIES = ["publica", "privada"] as const;
export type PlanVisibilityDto = (typeof PLAN_VISIBILITIES)[number];

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsIn(PLAN_TYPES)
  type!: PlanTypeDto;

  @IsOptional()
  @IsIn(PLAN_VISIBILITIES)
  visibility?: PlanVisibilityDto;

  @IsDateString({ strict: true })
  startDate!: string;

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
