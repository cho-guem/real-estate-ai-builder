import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type WebsiteArtifact = Tables<"website_artifacts">;
type WebsiteArtifactInsert = TablesInsert<"website_artifacts">;
type WebsiteArtifactUpdate = TablesUpdate<"website_artifacts">;
type WebsiteArtifactType = Database["public"]["Enums"]["website_artifact_type"];

export class WebsiteArtifactRepository extends BaseRepository<
  WebsiteArtifact,
  WebsiteArtifactInsert,
  WebsiteArtifactUpdate
> {
  constructor(db: DbClient) {
    super(db, "website_artifacts");
  }

  async findById(id: string): Promise<WebsiteArtifact | null> {
    const { data, error } = await this.db
      .from("website_artifacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async findAll(): Promise<WebsiteArtifact[]> {
    const { data, error } = await this.db
      .from("website_artifacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByProjectId(projectId: string): Promise<WebsiteArtifact[]> {
    const { data, error } = await this.db
      .from("website_artifacts")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByRunId(runId: string): Promise<WebsiteArtifact[]> {
    const { data, error } = await this.db
      .from("website_artifacts")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: false });

    if (error) this.handleError(error);
    return data ?? [];
  }

  async findLatestByType(
    projectId: string,
    artifactType: WebsiteArtifactType
  ): Promise<WebsiteArtifact | null> {
    const { data, error } = await this.db
      .from("website_artifacts")
      .select("*")
      .eq("project_id", projectId)
      .eq("artifact_type", artifactType)
      .order("version", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) this.handleError(error);
    return data;
  }

  async create(data: WebsiteArtifactInsert): Promise<WebsiteArtifact> {
    const { data: created, error } = await this.db
      .from("website_artifacts")
      .insert(data)
      .select()
      .single();

    if (error) this.handleError(error);
    return created!;
  }

  async update(id: string, data: WebsiteArtifactUpdate): Promise<WebsiteArtifact> {
    const { data: updated, error } = await this.db
      .from("website_artifacts")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("website_artifacts").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
