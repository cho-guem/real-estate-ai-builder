import { BaseService } from "./base/service.base";
import type { DbClient } from "@/repositories/base/repository.base";
import { AUTH_REDIRECT_URL } from "@/lib/constants";

export class AuthService extends BaseService {
  constructor(private readonly db: DbClient) {
    super();
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) this.handleError(error, "AuthService.signInWithEmail");
    return data;
  }

  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await this.db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_REDIRECT_URL },
    });
    if (error) this.handleError(error, "AuthService.signUpWithEmail");
    return data;
  }

  async signOut() {
    const { error } = await this.db.auth.signOut();
    if (error) this.handleError(error, "AuthService.signOut");
  }

  async getUser() {
    const {
      data: { user },
      error,
    } = await this.db.auth.getUser();
    if (error) this.handleError(error, "AuthService.getUser");
    return user;
  }

  async resetPassword(email: string) {
    const { error } = await this.db.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_REDIRECT_URL}?next=/settings`,
    });
    if (error) this.handleError(error, "AuthService.resetPassword");
  }
}
