import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type Project = Tables<"projects">;
type ProjectInsert = TablesInsert<"projects">;
type ProjectUpdate = TablesUpdate<"projects">;

export class ProjectRepository extends BaseRepository<Project, ProjectInsert, ProjectUpdate> {
  constructor(db: DbClient) {
    super(db, "projects");
  }

  async findById(id: string): Promise<Project | null> {
    const { data, error } = await this.db
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async findAll(): Promise<Project[]> {
    const { data, error } = await this.db.from("projects").select("*");
    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const { data, error } = await this.db
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async create(data: ProjectInsert): Promise<Project> {
    const { data: created, error } = await this.db
      .from("projects")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);
    return created!;
  }

  async update(id: string, data: ProjectUpdate): Promise<Project> {
    const { data: updated, error } = await this.db
      .from("projects")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("projects").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
