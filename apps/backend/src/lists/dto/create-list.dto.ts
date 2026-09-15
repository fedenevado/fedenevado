import { IsNotEmpty, IsOptional, IsUUID, MaxLength } from "class-validator";

export class CreateListDto {
  // Requerido si no se indica templateId. Si se indica templateId, se
  // ignora: la lista toma el título de la plantilla (igual que el
  // prototipo, que no pide título al crear desde plantilla).
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  // Si se indica, la lista se crea con el título y los elementos actuales
  // de esta plantilla (propiedad del usuario autenticado) en vez de vacía.
  @IsOptional()
  @IsUUID("4")
  templateId?: string;
}
