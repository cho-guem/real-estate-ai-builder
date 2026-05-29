import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type Deployment = Tables<"wordpress_deployments">;
type DeploymentInsert = TablesInsert<"wordpress_deployments">;
type DeploymentUpdate = TablesUpdate<"wordpress_deployments">;

export class WordPressDeploymentRepository extends BaseRepository<
  Deployment,
  DeploymentInsert,
  DeploymentUpdate
> {
  constructor(db: DbClient) {
    super(db, "wordpress_deployments");
  }

  async findById(id: string): Promise<Deployment | null> {
    const { data, error } = await this.db
      .from("wordpress_deployments")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }
    return data;
  }

  async findAll(): Promise<Deployment[]> {
    const { data, error } = await this.db.from("wordpress_deployments").select("*");
    if (error) this.handleError(error);
    return data ?? [];
  }

  async findLatestByProjectId(projectId: string): Promise<Deployment | null> {
    const { data, error } = await this.db
      .from("wordpress_deployments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) this.handleError(error);
    return data ?? null;
  }

  async create(data: DeploymentInsert): Promise<Deployment> {
    const { data: created, error } = await this.db
      .from("wordpress_deployments")
      .insert(data)
      .select()
      .single();
    if (error) this.handleError(error);
    return created!;
  }

  async update(id: string, data: DeploymentUpdate): Promise<Deployment> {
    const { data: updated, error } = await this.db
      .from("wordpress_deployments")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("wordpress_deployments").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
