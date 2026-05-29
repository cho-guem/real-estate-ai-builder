import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type DeploymentStep = Tables<"wordpress_deployment_steps">;
type DeploymentStepInsert = TablesInsert<"wordpress_deployment_steps">;
type DeploymentStepUpdate = TablesUpdate<"wordpress_deployment_steps">;

export class WordPressDeploymentStepRepository extends BaseRepository<
  DeploymentStep,
  DeploymentStepInsert,
  DeploymentStepUpdate
> {
  constructor(db: DbClient) {
    super(db, "wordpress_deployment_steps");
  }

  async findById(id: string): Promise<DeploymentStep | null> {
    const { data, error } = await this.db
      .from("wordpress_deployment_steps")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }
    return data;
  }

  async findAll(): Promise<DeploymentStep[]> {
    const { data, error } = await this.db.from("wordpress_deployment_steps").select("*");
    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByDeploymentId(deploymentId: string): Promise<DeploymentStep[]> {
    const { data, error } = await this.db
      .from("wordpress_deployment_steps")
      .select("*")
      .eq("deployment_id", deploymentId)
      .order("order_index", { ascending: true });
    if (error) this.handleError(error);
    return data ?? [];
  }

  async create(data: DeploymentStepInsert): Promise<DeploymentStep> {
    const { data: created, error } = await this.db
      .from("wordpress_deployment_steps")
      .insert(data)
      .select()
      .single();
    if (error) this.handleError(error);
    return created!;
  }

  async createMany(data: DeploymentStepInsert[]): Promise<DeploymentStep[]> {
    const { data: created, error } = await this.db
      .from("wordpress_deployment_steps")
      .insert(data)
      .select()
      .order("order_index", { ascending: true });
    if (error) this.handleError(error);
    return created ?? [];
  }

  async update(id: string, data: DeploymentStepUpdate): Promise<DeploymentStep> {
    const { data: updated, error } = await this.db
      .from("wordpress_deployment_steps")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) this.handleError(error);
    return updated!;
  }
  
  async updateStatusByStepKey(
  deploymentId: string,
  stepKey: string,
  status: DeploymentStepUpdate["status"]
): Promise<DeploymentStep[]> {
  const { data, error } = await this.db
    .from("wordpress_deployment_steps")
    .update({
      status,
      updated_at: new Date().toISOString(),
    } as DeploymentStepUpdate)
    .eq("deployment_id", deploymentId)
    .eq("step_key", stepKey)
    .select();

  if (error) this.handleError(error);
  return data ?? [];
}

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("wordpress_deployment_steps").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
