import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type PreflightCheck = {
  key: string;
  label: string;
  status: "success" | "error" | "warning";
  passed: boolean;
  message: string;
  help?: string;
  command?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const deploymentMode = body.deploymentMode === "existing_hosting" ? "existing_hosting" : "managed_hosting";
  const config = {
    wordpressPath: process.env.WORDPRESS_TARGET_PATH || "",
    wpCliBin: process.env.WORDPRESS_WPCLI_BIN || "wp",
    pluginZipPath: process.env.WORDPRESS_PLUGIN_PACKAGE_PATH || "",
    elementorTemplatePath: process.env.WORDPRESS_ELEMENTOR_TEMPLATE_PATH || "",
    dockerBin: process.env.MANAGED_HOSTING_DOCKER_BIN || "docker",
    managedVolumePath: process.env.MANAGED_HOSTING_VOLUME_PATH || "",
    composeFile: process.env.MANAGED_HOSTING_COMPOSE_FILE || "docker-compose.wordpress.yml",
  };

  const checks: PreflightCheck[] = [];
  checks.push(await checkSupabaseConnection(supabase));
  if (deploymentMode === "existing_hosting") {
    checks.push(await checkPathExists("wordpress_target_path", "기존 홈페이지 위치 확인", config.wordpressPath));
    checks.push(
      await checkPathExists(
        "wp_config",
        "기존 홈페이지 설정 파일 확인",
        config.wordpressPath ? path.join(config.wordpressPath, "wp-config.php") : "",
        "기존 홈페이지가 설치된 위치를 확인해주세요."
      )
    );
    checks.push(await checkWpCliAvailable(config.wpCliBin));
    checks.push(await checkPluginInstallPossible(config.wpCliBin, config.wordpressPath, config.pluginZipPath));
    checks.push(await checkElementorInstalled(config.wpCliBin, config.wordpressPath));
    checks.push(await checkUploadPathWritable(config.wordpressPath));
  } else {
    checks.push(await checkDockerAvailable(config.dockerBin));
    checks.push(await checkDockerComposeAvailable(config.dockerBin, config.composeFile));
    checks.push(await checkManagedVolumeWritable(config.managedVolumePath));
    checks.push({
      key: "managed_domain",
      label: "기본 주소 준비",
      status: "success",
      passed: true,
      message: "기본 주소를 자동으로 만들 준비가 되었습니다.",
    });
  }
  checks.push(
    await checkPathExists(
      "plugin_zip",
      "홈페이지 기능 파일 준비",
      config.pluginZipPath,
      "홈페이지 기능 파일 경로를 설정해주세요."
    )
  );
  checks.push(
    await checkPathExists(
      "elementor_template",
      "디자인 파일 준비",
      config.elementorTemplatePath,
      "홈페이지 디자인 파일 경로를 설정해주세요."
    )
  );

  return NextResponse.json({
    passed: checks.every((check) => check.status !== "error"),
    checkedAt: new Date().toISOString(),
    checks,
  });
}

async function checkSupabaseConnection(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<PreflightCheck> {
  try {
    const { error } = await supabase.from("projects").select("id").limit(1);
    if (error) throw error;
    return {
      key: "supabase",
      label: "서비스 연결 확인",
      status: "success",
      passed: true,
      message: "서비스가 홈페이지 생성 요청을 저장할 준비가 되었습니다.",
    };
  } catch (error) {
    return failedCheck("supabase", "서비스 연결 확인", error, "서비스 연결 설정을 확인해주세요.");
  }
}

async function checkPathExists(
  key: string,
  label: string,
  targetPath: string,
  help?: string
): Promise<PreflightCheck> {
  if (!targetPath) {
    return {
      key,
      label,
      status: "error",
      passed: false,
      message: "필요한 준비 정보가 아직 설정되지 않았습니다.",
      help,
    };
  }

  try {
    await access(targetPath);
    return {
      key,
      label,
      status: "success",
      passed: true,
      message: targetPath,
    };
  } catch (error) {
    return failedCheck(key, label, error, help || `${targetPath} 경로가 존재하는지 확인해주세요.`);
  }
}

async function checkWpCliAvailable(wpCliBin: string): Promise<PreflightCheck> {
  const command = `${wpCliBin} --info`;
  try {
    await execFileAsync(wpCliBin, ["--info"], {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      key: "wp_cli",
      label: "기존 사이트 연결 도구 확인",
      status: "success",
      passed: true,
      message: "기존 홈페이지에 연결할 수 있는 도구가 정상 응답했습니다.",
      command,
    };
  } catch (error) {
    return failedCheck(
      "wp_cli",
      "기존 사이트 연결 도구 확인",
      error,
      "호스팅 서버에서 홈페이지 연결 도구를 사용할 수 있는지 확인해주세요.",
      command
    );
  }
}

async function checkPluginInstallPossible(
  wpCliBin: string,
  wordpressPath: string,
  pluginZipPath: string
): Promise<PreflightCheck> {
  const args = ["plugin", "list", "--format=json", ...(wordpressPath ? [`--path=${wordpressPath}`] : [])];
  const command = `${wpCliBin} ${args.join(" ")}`;
  if (!wordpressPath) {
    return {
      key: "plugin_install_possible",
      label: "홈페이지 기능 파일 준비",
      status: "error",
      passed: false,
      message: "기존 홈페이지 위치가 설정되지 않았습니다.",
      help: "기존 홈페이지가 설치된 서버 경로를 설정해주세요.",
      command,
    };
  }

  if (!pluginZipPath) {
    return {
      key: "plugin_install_possible",
      label: "홈페이지 기능 파일 준비",
      status: "error",
      passed: false,
      message: "설치에 필요한 기능 파일 경로가 설정되지 않았습니다.",
      help: "홈페이지 기능 파일 경로를 확인해주세요.",
      command,
    };
  }

  try {
    await access(pluginZipPath);
    await execFileAsync(wpCliBin, args, {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      key: "plugin_install_possible",
      label: "홈페이지 기능 파일 준비",
      status: "success",
      passed: true,
      message: "홈페이지 기능 파일을 설치할 준비가 되었습니다.",
      command,
    };
  } catch (error) {
    return failedCheck(
      "plugin_install_possible",
      "홈페이지 기능 파일 준비",
      error,
      "기능 파일 경로와 기존 홈페이지 연결 권한을 확인해주세요.",
      command
    );
  }
}

async function checkElementorInstalled(wpCliBin: string, wordpressPath: string): Promise<PreflightCheck> {
  const args = ["plugin", "is-installed", "elementor", ...(wordpressPath ? [`--path=${wordpressPath}`] : [])];
  const command = `${wpCliBin} ${args.join(" ")}`;
  try {
    await execFileAsync(wpCliBin, args, {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      key: "elementor_installed",
      label: "디자인 파일 준비",
      status: "success",
      passed: true,
      message: "디자인 템플릿을 적용할 준비가 되어 있습니다.",
      command,
    };
  } catch {
    return {
      key: "elementor_installed",
      label: "디자인 파일 준비",
      status: "warning",
      passed: true,
      message: "디자인 템플릿 도구가 아직 확인되지 않았습니다.",
      help: "설치 과정에서 디자인 도구를 먼저 준비해야 할 수 있습니다.",
      command,
    };
  }
}

async function checkUploadPathWritable(wordpressPath: string): Promise<PreflightCheck> {
  const uploadPath = wordpressPath ? path.join(wordpressPath, "wp-content", "uploads") : "";
  if (!uploadPath) {
    return {
      key: "upload_path_writable",
      label: "저장 공간 확인",
      status: "error",
      passed: false,
      message: "기존 홈페이지 위치가 없어 파일 업로드 위치를 확인할 수 없습니다.",
    };
  }

  try {
    await access(uploadPath, constants.W_OK);
    return {
      key: "upload_path_writable",
      label: "저장 공간 확인",
      status: "success",
      passed: true,
      message: "홈페이지 파일 업로드 위치에 쓰기 권한이 있습니다.",
    };
  } catch (error) {
    return failedCheck(
      "upload_path_writable",
      "저장 공간 확인",
      error,
      "기존 홈페이지의 파일 업로드 권한을 확인해주세요."
    );
  }
}

async function checkDockerAvailable(dockerBin: string): Promise<PreflightCheck> {
  const command = `${dockerBin} --version`;
  try {
    await execFileAsync(dockerBin, ["--version"], {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      key: "docker",
      label: "자동 생성 서버 확인",
      status: "success",
      passed: true,
      message: "새 홈페이지를 자동 생성할 서버 환경이 준비되어 있습니다.",
      command,
    };
  } catch {
    return {
      key: "docker",
      label: "자동 생성 서버 확인",
      status: "warning",
      passed: true,
      message: "현재는 테스트 환경이라 자동 설치 서버가 연결되어 있지 않습니다. 실제 서비스 서버가 연결되면 홈페이지 자동 생성이 가능합니다.",
      help: "실서비스 서버에서는 자동 생성 서버가 연결됩니다.",
      command,
    };
  }
}

async function checkDockerComposeAvailable(dockerBin: string, composeFile: string): Promise<PreflightCheck> {
  const args = ["compose", "-f", composeFile, "config"];
  const command = `${dockerBin} ${args.join(" ")}`;
  try {
    await access(composeFile);
    await execFileAsync(dockerBin, args, {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return {
      key: "wordpress_container_plan",
      label: "기본 주소 준비",
      status: "success",
      passed: true,
      message: "새 홈페이지 생성 계획을 정상적으로 확인했습니다.",
      command,
    };
  } catch {
    return {
      key: "wordpress_container_plan",
      label: "기본 주소 준비",
      status: "warning",
      passed: true,
      message: "현재는 테스트 환경이라 자동 설치 서버가 연결되어 있지 않습니다. 실제 서비스 서버가 연결되면 홈페이지 자동 생성이 가능합니다.",
      help: "실제 서비스 서버에서 기본 주소 생성 설정을 확인합니다.",
      command,
    };
  }
}

async function checkManagedVolumeWritable(volumePath: string): Promise<PreflightCheck> {
  if (!volumePath) {
    return {
      key: "volume_mount_possible",
      label: "저장 공간 확인",
      status: "warning",
      passed: true,
      message: "별도 저장 공간 경로가 없어 기본 저장 방식으로 진행합니다.",
      help: "전용 저장 공간을 사용하려면 서버 저장 경로를 설정하세요.",
    };
  }

  try {
    await access(volumePath, constants.W_OK);
    return {
      key: "volume_mount_possible",
      label: "저장 공간 확인",
      status: "success",
      passed: true,
      message: "홈페이지 저장 공간에 쓰기 권한이 있습니다.",
    };
  } catch (error) {
    return failedCheck(
      "volume_mount_possible",
      "저장 공간 확인",
      error,
      "홈페이지 저장 공간 권한을 확인해주세요."
    );
  }
}

function failedCheck(
  key: string,
  label: string,
  error: unknown,
  help?: string,
  command?: string
): PreflightCheck {
  return {
    key,
    label,
    status: "error",
    passed: false,
    message: error instanceof Error ? error.message : "검사에 실패했습니다.",
    help,
    command,
  };
}
