import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type GenerationRun = Tables<"generation_runs">;
type GenerationRunInsert = TablesInsert<"generation_runs">;
type GenerationRunUpdate = TablesUpdate<"generation_runs">;

export class GenerationRunRepository extends BaseRepository<
  GenerationRun,
  GenerationRunInsert,
  GenerationRunUpdate
> {
  constructor(db: DbClient) {
    super(db, "generation_runs");
  }

  async findById(id: string): Promise<GenerationRun | null> {
    const { data, error } = await this.db
      .from("generation_runs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async findAll(): Promise<GenerationRun[]> {
    const { data, error } = await this.db
      .from("generation_runs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByProjectId(projectId: string): Promise<GenerationRun[]> {
    const { data, error } = await this.db
      .from("generation_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findLatestByProjectId(projectId: string): Promise<GenerationRun | null> {
    const { data, error } = await this.db
      .from("generation_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) this.handleError(error);
    return data;
  }

  async create(data: GenerationRunInsert): Promise<GenerationRun> {
    const { data: created, error } = await this.db
      .from("generation_runs")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);
    return created!;
  }

  async update(id: string, data: GenerationRunUpdate): Promise<GenerationRun> {
    const { data: updated, error } = await this.db
      .from("generation_runs")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("generation_runs").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
