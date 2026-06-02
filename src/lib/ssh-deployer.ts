import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NodeSSH } from "node-ssh";

export class SSHDeployer {
  private ssh = new NodeSSH();

  async connect() {
    const host = envValue("WORDPRESS_SSH_HOST") ?? envValue("DEPLOYMENT_SERVER_HOST");
    const port = Number(
      envValue("WORDPRESS_SSH_PORT") ?? envValue("DEPLOYMENT_SERVER_PORT") ?? 22
    );
    const username =
      envValue("WORDPRESS_SSH_USERNAME") ?? envValue("DEPLOYMENT_SERVER_USER");
    const rawPassword =
      envValue("WORDPRESS_SSH_PASSWORD", { preferDotenv: true }) ??
      envValue("DEPLOYMENT_SERVER_PASSWORD", { preferDotenv: true });

    console.log("[SSH ENV CHECK]", {
      host,
      port,
      username,
      hasPassword: Boolean(rawPassword),
    });

    if (!host || !username || !rawPassword) {
      throw new Error("SSH 환경변수가 비어있습니다.");
    }

    const password = rawPassword.trim();

    console.log("[SSH CONNECT TRY]", {
      host,
      username,
      passwordLength: password.length,
    });

    await this.ssh.connect({
      host,
      port,
      username,
      password,
      tryKeyboard: true,
      readyTimeout: 20_000,
    });

    console.log("[SSH CONNECT SUCCESS]");
  }

  async exec(command: string) {
    const result = await this.ssh.execCommand(command);

    if (result.code !== 0) {
      throw new Error(result.stderr || "명령 실행 실패");
    }

    return result;
  }

  disconnect() {
    this.ssh.dispose();
  }
}

function envValue(name: string, options: { preferDotenv?: boolean } = {}) {
  const dotenvValue = readDotenvValue(name);
  if (options.preferDotenv && dotenvValue) return dotenvValue;
  return process.env[name] || dotenvValue;
}

function readDotenvValue(name: string) {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return undefined;

  const content = readFileSync(filePath, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  if (!line) return undefined;

  const rawValue = line.slice(name.length + 1).trim();
  return parseDotenvValue(rawValue);
}

function parseDotenvValue(value: string) {
  const unquoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
      ? value.slice(1, -1)
      : value;

  return unquoted
    .replace(/\\\$/g, "$")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}
