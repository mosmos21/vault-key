import chalk from 'chalk';

/**
 * 成功メッセージをフォーマット
 */
export const formatSuccess = (message: string): string => {
  return chalk.green(`✓ ${message}`);
};

/**
 * エラーメッセージをフォーマット
 */
export const formatError = (message: string): string => {
  return chalk.red(`✗ ${message}`);
};

/**
 * 警告メッセージをフォーマット
 */
export const formatWarning = (message: string): string => {
  return chalk.yellow(`⚠ ${message}`);
};

/**
 * 情報メッセージをフォーマット
 */
export const formatInfo = (message: string): string => {
  return chalk.blue(`ℹ ${message}`);
};

/**
 * トークン情報をテーブル形式でフォーマット
 */
export const formatTokenTable = (
  tokens: Array<{
    tokenHash: string;
    userId: string;
    createdAt: string;
    expiresAt: string;
  }>,
): string => {
  if (tokens.length === 0) {
    return formatInfo('トークンがありません');
  }

  const header = `${chalk.bold('Token Hash')}  ${chalk.bold('User ID')}  ${chalk.bold('Created At')}  ${chalk.bold('Expires At')}`;
  const rows = tokens.map((token) => {
    const createdAt = new Date(token.createdAt).toLocaleString('ja-JP');
    const expiresAt = new Date(token.expiresAt).toLocaleString('ja-JP');
    const hashPreview = token.tokenHash.substring(0, 16) + '...';
    return `${hashPreview}  ${token.userId}  ${createdAt}  ${expiresAt}`;
  });

  return [header, ...rows].join('\n');
};

/**
 * シークレット一覧をテーブル形式でフォーマット
 */
export const formatSecretList = (keys: string[]): string => {
  if (keys.length === 0) {
    return formatInfo('機密情報がありません');
  }

  const header = chalk.bold('Key');
  const rows = keys.map((key) => key);

  return [header, ...rows].join('\n');
};
