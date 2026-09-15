import { ArrayNotEmpty, ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateListTemplateDto {
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  items!: string[];
}
