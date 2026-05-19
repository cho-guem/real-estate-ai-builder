import { BaseService } from "./base/service.base";
import { GenerationRunRepository } from "@/repositories/generation-run.repository";
import { GenerationStepRepository } from "@/repositories/generation-step.repository";
import { WebsiteArtifactRepository } from "@/repositories/website-artifact.repository";
import type { DbClient } from "@/repositories/base/repository.base";
import type { Database, TablesInsert, TablesUpdate } from "@/types/database.types";

type ArtifactType = Database["public"]["Enums"]["website_artifact_type"];

export class GenerationWorkflowService extends BaseService {
  private readonly runRepo: GenerationRunRepository;
  private readonly stepRepo: GenerationStepRepository;
  private readonly artifactRepo: WebsiteArtifactRepository;

  constructor(db: DbClient) {
    super();
    this.runRepo = new GenerationRunRepository(db);
    this.stepRepo = new GenerationStepRepository(db);
    this.artifactRepo = new WebsiteArtifactRepository(db);
  }

  async createRun(data: TablesInsert<"generation_runs">) {
    return this.runRepo.create(data);
  }

  async getRunById(id: string) {
    return this.runRepo.findById(id);
  }

  async getProjectRuns(projectId: string) {
    return this.runRepo.findByProjectId(projectId);
  }

  async getLatestProjectRun(projectId: string) {
    return this.runRepo.findLatestByProjectId(projectId);
  }

  async updateRun(id: string, data: TablesUpdate<"generation_runs">) {
    return this.runRepo.update(id, data);
  }

  async deleteRun(id: string) {
    return this.runRepo.delete(id);
  }

  async createStep(data: TablesInsert<"generation_steps">) {
    return this.stepRepo.create(data);
  }

  async getStepById(id: string) {
    return this.stepRepo.findById(id);
  }

  async getRunSteps(runId: string) {
    return this.stepRepo.findByRunId(runId);
  }

  async getRunStep(runId: string, stepKey: string) {
    return this.stepRepo.findByRunIdAndStepKey(runId, stepKey);
  }

  async updateStep(id: string, data: TablesUpdate<"generation_steps">) {
    return this.stepRepo.update(id, data);
  }

  async deleteStep(id: string) {
    return this.stepRepo.delete(id);
  }

  async createArtifact(data: TablesInsert<"website_artifacts">) {
    return this.artifactRepo.create(data);
  }

  async getArtifactById(id: string) {
    return this.artifactRepo.findById(id);
  }

  async getProjectArtifacts(projectId: string) {
    return this.artifactRepo.findByProjectId(projectId);
  }

  async getRunArtifacts(runId: string) {
    return this.artifactRepo.findByRunId(runId);
  }

  async getLatestArtifactByType(projectId: string, artifactType: ArtifactType) {
    return this.artifactRepo.findLatestByType(projectId, artifactType);
  }

  async updateArtifact(id: string, data: TablesUpdate<"website_artifacts">) {
    return this.artifactRepo.update(id, data);
  }

  async deleteArtifact(id: string) {
    return this.artifactRepo.delete(id);
  }
}
