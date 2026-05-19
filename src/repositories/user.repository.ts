import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type User = Tables<"users">;
type UserInsert = TablesInsert<"users">;
type UserUpdate = TablesUpdate<"users">;

export class UserRepository extends BaseRepository<User, UserInsert, UserUpdate> {
  constructor(db: DbClient) {
    super(db, "users");
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async findAll(): Promise<User[]> {
    const { data, error } = await this.db.from("users").select("*");
    if (error) this.handleError(error);
    return data ?? [];
  }

  async create(data: UserInsert): Promise<User> {
    const { data: created, error } = await this.db
      .from("users")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);
    return created!;
  }

  async update(id: string, data: UserUpdate): Promise<User> {
    const { data: updated, error } = await this.db
      .from("users")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("users").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
