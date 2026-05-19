import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type DbClient = SupabaseClient<Database>;

export interface IRepository<T, TInsert, TUpdate> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: TInsert): Promise<T>;
  update(id: string, data: TUpdate): Promise<T>;
  delete(id: string): Promise<void>;
}

export abstract class BaseRepository<T, TInsert, TUpdate>
  implements IRepository<T, TInsert, TUpdate>
{
  constructor(
    protected readonly db: DbClient,
    protected readonly tableName: string
  ) {}

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: TInsert): Promise<T>;
  abstract update(id: string, data: TUpdate): Promise<T>;
  abstract delete(id: string): Promise<void>;

  protected handleError(error: unknown): never {
    if (error instanceof Error) throw error;
    throw new Error("An unexpected database error occurred");
  }
}
