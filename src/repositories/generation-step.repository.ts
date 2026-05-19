import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type GenerationStep = Tables<"generation_steps">;
type GenerationStepInsert = TablesInsert<"generation_steps">;
type GenerationStepUpdate = TablesUpdate<"generation_steps">;

export class GenerationStepRepository extends BaseRepository<
  GenerationStep,
  GenerationStepInsert,
  GenerationStepUpdate
> {
  constructor(db: DbClient) {
    super(db, "generation_steps");
  }

  async findById(id: string): Promise<GenerationStep | null> {
    const { data, error } = await this.db
      .from("generation_steps")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async findAll(): Promise<GenerationStep[]> {
    const { data, error } = await this.db
      .from("generation_steps")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByRunId(runId: string): Promise<GenerationStep[]> {
    const { data, error } = await this.db
      .from("generation_steps")
      .select("*")
      .eq("run_id", runId)
      .order("order_index", { ascending: true });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByRunIdAndStepKey(
    runId: string,
    stepKey: string
  ): Promise<GenerationStep | null> {
    const { data, error } = await this.db
      .from("generation_steps")
      .select("*")
      .eq("run_id", runId)
      .eq("step_key", stepKey)
      .maybeSingle();

    if (error) this.handleError(error);
    return data;
  }

  async create(data: GenerationStepInsert): Promise<GenerationStep> {
    const { data: created, error } = await this.db
      .from("generation_steps")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);
    return created!;
  }

  async update(id: string, data: GenerationStepUpdate): Promise<GenerationStep> {
    const { data: updated, error } = await this.db
      .from("generation_steps")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("generation_steps").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
