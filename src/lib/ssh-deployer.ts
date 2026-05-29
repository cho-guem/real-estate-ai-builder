import { NodeSSH } from 'node-ssh';

export class SSHDeployer {
  private ssh = new NodeSSH();

  async connect() {
    const host = process.env.WORDPRESS_SSH_HOST;
    const port = Number(process.env.WORDPRESS_SSH_PORT || 22);
    const username = process.env.WORDPRESS_SSH_USERNAME;
    const rawPassword = process.env.WORDPRESS_SSH_PASSWORD;

    console.log('[SSH ENV CHECK]', {
      host,
      port,
      username,
      hasPassword: !!rawPassword,
    });

    if (!host || !username || !rawPassword) {
      throw new Error('SSH 환경변수가 비어있습니다.');
    }

    const password = rawPassword
      .replace(/^['"]|['"]$/g, '')
      .trim();

    console.log('[SSH CONNECT TRY]', {
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
      readyTimeout: 20000,
    });

    console.log('[SSH CONNECT SUCCESS]');
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