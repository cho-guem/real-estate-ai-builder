export abstract class BaseService {
  protected handleError(error: unknown, context?: string): never {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    throw new Error(context ? `[${context}] ${message}` : message);
  }
}
