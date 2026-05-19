import { BaseService } from "./base/service.base";
import { ProjectRepository } from "@/repositories/project.repository";
import type { DbClient } from "@/repositories/base/repository.base";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

export class ProjectService extends BaseService {
  private readonly projectRepo: ProjectRepository;

  constructor(db: DbClient) {
    super();
    this.projectRepo = new ProjectRepository(db);
  }

  async getUserProjects(userId: string) {
    return this.projectRepo.findByUserId(userId);
  }

  async getProjectById(id: string) {
    return this.projectRepo.findById(id);
  }

  async createProject(data: TablesInsert<"projects">) {
    return this.projectRepo.create(data);
  }

  async updateProject(id: string, data: TablesUpdate<"projects">) {
    return this.projectRepo.update(id, data);
  }

  async deleteProject(id: string) {
    return this.projectRepo.delete(id);
  }
}
