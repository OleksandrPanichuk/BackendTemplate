export type InfiniteResponse<T> = Promise<{
  nextCursor: string | null;
  data: T[];
}>;
