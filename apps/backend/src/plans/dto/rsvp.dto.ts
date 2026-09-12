import { IsIn } from "class-validator";

const RSVP_STATUSES = ["yes", "maybe", "no"] as const;
export type RsvpStatusDto = (typeof RSVP_STATUSES)[number];

export class RsvpDto {
  @IsIn(RSVP_STATUSES)
  status!: RsvpStatusDto;
}
