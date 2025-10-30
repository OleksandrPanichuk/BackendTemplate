import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export function IsRequiredString(
  minLength: number = 1,
  maxLength: number = 255,
  {
    not_string_msg = 'Must be a string',
    empty_msg = 'Should not be empty',
    min_length_msg = `Must be at least ${minLength} characters`,
    max_length_msg = `Must be at most ${maxLength} characters`,
  }: {
    not_string_msg?: string;
    empty_msg?: string;
    min_length_msg?: string;
    max_length_msg?: string;
  } = {},
) {
  return applyDecorators(
    IsString({ message: not_string_msg }),
    IsNotEmpty({ message: empty_msg }),
    MinLength(minLength, { message: min_length_msg }),
    MaxLength(maxLength, { message: max_length_msg }),
  );
}
