import { BaseRepository } from "./base/repository.base";
import type { DbClient } from "./base/repository.base";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

type WordPressSite = Tables<"wordpress_sites">;
type WordPressSiteInsert = TablesInsert<"wordpress_sites">;
type WordPressSiteUpdate = TablesUpdate<"wordpress_sites">;

export class WordPressSiteRepository extends BaseRepository<
  WordPressSite,
  WordPressSiteInsert,
  WordPressSiteUpdate
> {
  constructor(db: DbClient) {
    super(db, "wordpress_sites");
  }

  async findById(id: string): Promise<WordPressSite | null> {
    const { data, error } = await this.db.from("wordpress_sites").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }
    return data;
  }

  async findAll(): Promise<WordPressSite[]> {
    const { data, error } = await this.db.from("wordpress_sites").select("*");
    if (error) this.handleError(error);
    return data ?? [];
  }

  async findByProjectId(projectId: string): Promise<WordPressSite | null> {
    const { data, error } = await this.db
      .from("wordpress_sites")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) this.handleError(error);
    return data ?? null;
  }

  async create(data: WordPressSiteInsert): Promise<WordPressSite> {
    const { data: created, error } = await this.db
      .from("wordpress_sites")
      .insert(data)
      .select()
      .single();
    if (error) this.handleError(error);
    return created!;
  }

  async upsertByProject(data: WordPressSiteInsert): Promise<WordPressSite> {
    const { data: site, error } = await this.db
      .from("wordpress_sites")
      .upsert(data, { onConflict: "project_id" })
      .select()
      .single();
    if (error) this.handleError(error);
    return site!;
  }

  async update(id: string, data: WordPressSiteUpdate): Promise<WordPressSite> {
    const { data: updated, error } = await this.db
      .from("wordpress_sites")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) this.handleError(error);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("wordpress_sites").delete().eq("id", id);
    if (error) this.handleError(error);
  }
}
