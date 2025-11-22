import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';

export function Trim() {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') {
        throw new Error(
          'Trim decorator can only be applied to string properties',
        );
      }

      return value.trim();
    }),
  );
}

export function ToLowerCase() {
  return applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') {
        throw new Error(
          'ToLowerCase decorator can only be applied to string properties',
        );
      }

      return value.toLowerCase();
    }),
  );
}

export function TrimAndLower() {
  return applyDecorators(Trim(), ToLowerCase());
}

export function ToNumber() {
  return applyDecorators(
    Trim(),
    Transform(({ value }) => {
      if (typeof value !== 'string') {
        throw new Error(
          'ToNumber decorator can only be applied to string properties',
        );
      }

      return Number(value);
    }),
  );
}
