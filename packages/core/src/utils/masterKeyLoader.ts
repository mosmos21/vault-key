import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateMasterKey } from '@core/crypto';
import { ValidationError } from '@core/utils/errors';
import { validateMasterKey } from '@core/utils/validators';

/**
 * Master key の読み込み元を示す列挙型
 */
export type MasterKeySource =
  | 'option' // CLI オプション --master-key
  | 'option-file' // CLI オプション --master-key-file
  | 'env-direct' // 環境変数 VAULTKEY_ENCRYPTION_KEY または VAULTKEY_MASTER_KEY
  | 'env-file' // 環境変数 VAULTKEY_MASTER_KEY_FILE
  | 'default-file' // デフォルトファイル ~/.vaultkey/master.key
  | 'generated'; // 自動生成

/**
 * loadMasterKey 関数のオプション
 */
export type LoadMasterKeyOptions = {
  /** CLI オプション --master-key で指定された master key */
  masterKey?: string;
  /** CLI オプション --master-key-file で指定されたファイルパス */
  masterKeyFile?: string;
};

/**
 * loadMasterKey 関数の戻り値
 */
export type LoadMasterKeyResult = {
  /** 読み込まれた master key */
  masterKey: string;
  /** 読み込み元 */
  source: MasterKeySource;
  /** ファイルから読み込んだ場合のパス */
  filePath?: string;
};

/**
 * デフォルトの master key ファイルパス
 */
export const DEFAULT_MASTER_KEY_FILE = path.join(
  os.homedir(),
  '.vaultkey',
  'master.key',
);

/**
 * ファイルから master key を読み込む
 *
 * @param filePath - ファイルパス
 * @returns 読み込んだ master key
 * @throws ValidationError - ファイルが存在しない、または master key のフォーマットが不正
 */
const readMasterKeyFromFile = (filePath: string): string => {
  if (!fs.existsSync(filePath)) {
    throw new ValidationError(`Master key file not found: ${filePath}`);
  }

  checkFilePermissions(filePath);

  const masterKey = fs.readFileSync(filePath, 'utf-8').trim();

  try {
    validateMasterKey(masterKey);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(
        `Invalid master key format in file ${filePath}: ${error.message}`,
      );
    }
    throw error;
  }

  return masterKey;
};

/**
 * ファイル権限が 600 (所有者のみ読み書き可能) かチェックする
 * 権限が 600 でない場合は警告を出力するが、処理は続行する
 *
 * @param filePath - ファイルパス
 * @returns 権限が 600 の場合 true、それ以外の場合 false
 */
export const checkFilePermissions = (filePath: string): boolean => {
  try {
    const stats = fs.statSync(filePath);
    const mode = stats.mode & 0o777;

    if (mode !== 0o600) {
      console.warn(
        `WARNING: Master key file ${filePath} has permissions ${mode.toString(8)}. Recommended permissions are 600 (owner read/write only).`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(
      `WARNING: Failed to check file permissions for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
};

/**
 * Master key をファイルに保存する
 * ファイルは権限 600 (所有者のみ読み書き可能) で作成される
 *
 * @param masterKey - 保存する master key
 * @param filePath - 保存先ファイルパス
 * @throws ValidationError - ファイル保存に失敗した場合
 */
export const saveMasterKeyToFile = (
  masterKey: string,
  filePath: string,
): void => {
  try {
    validateMasterKey(masterKey);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    fs.writeFileSync(filePath, masterKey, { mode: 0o600 });
  } catch (error) {
    throw new ValidationError(
      `Failed to save master key to file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * 優先順位に基づいて master key を読み込む
 *
 * 優先順位:
 * 1. CLI オプション --master-key (直接指定)
 * 2. CLI オプション --master-key-file (ファイル指定)
 * 3. 環境変数 VAULTKEY_ENCRYPTION_KEY (直接指定)
 * 4. 環境変数 VAULTKEY_MASTER_KEY (直接指定、互換性)
 * 5. 環境変数 VAULTKEY_MASTER_KEY_FILE (ファイル指定)
 * 6. デフォルトファイル ~/.vaultkey/master.key
 * 7. 自動生成 (デフォルトファイルに保存)
 *
 * @param options - 読み込みオプション
 * @returns 読み込んだ master key と読み込み元の情報
 * @throws ValidationError - master key のフォーマットが不正、またはファイル読み込みに失敗
 */
export const loadMasterKey = (
  options?: LoadMasterKeyOptions,
): LoadMasterKeyResult => {
  // 1. CLI オプション --master-key
  if (options?.masterKey) {
    try {
      validateMasterKey(options.masterKey);
      console.log('Master key loaded from CLI option --master-key');
      return {
        masterKey: options.masterKey,
        source: 'option',
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Invalid master key from CLI option --master-key: ${error.message}`,
        );
      }
      throw error;
    }
  }

  // 2. CLI オプション --master-key-file
  if (options?.masterKeyFile) {
    try {
      const masterKey = readMasterKeyFromFile(options.masterKeyFile);
      console.log(
        `Master key loaded from file specified by CLI option --master-key-file: ${options.masterKeyFile}`,
      );
      return {
        masterKey,
        source: 'option-file',
        filePath: options.masterKeyFile,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to load master key from file ${options.masterKeyFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 3. 環境変数 VAULTKEY_ENCRYPTION_KEY
  if (process.env.VAULTKEY_ENCRYPTION_KEY) {
    try {
      validateMasterKey(process.env.VAULTKEY_ENCRYPTION_KEY);
      console.log(
        'Master key loaded from environment variable VAULTKEY_ENCRYPTION_KEY',
      );
      return {
        masterKey: process.env.VAULTKEY_ENCRYPTION_KEY,
        source: 'env-direct',
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Invalid master key from environment variable VAULTKEY_ENCRYPTION_KEY: ${error.message}`,
        );
      }
      throw error;
    }
  }

  // 4. 環境変数 VAULTKEY_MASTER_KEY (互換性)
  if (process.env.VAULTKEY_MASTER_KEY) {
    try {
      validateMasterKey(process.env.VAULTKEY_MASTER_KEY);
      console.log(
        'Master key loaded from environment variable VAULTKEY_MASTER_KEY',
      );
      return {
        masterKey: process.env.VAULTKEY_MASTER_KEY,
        source: 'env-direct',
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Invalid master key from environment variable VAULTKEY_MASTER_KEY: ${error.message}`,
        );
      }
      throw error;
    }
  }

  // 5. 環境変数 VAULTKEY_MASTER_KEY_FILE
  if (process.env.VAULTKEY_MASTER_KEY_FILE) {
    try {
      const masterKey = readMasterKeyFromFile(
        process.env.VAULTKEY_MASTER_KEY_FILE,
      );
      console.log(
        `Master key loaded from file specified by environment variable VAULTKEY_MASTER_KEY_FILE: ${process.env.VAULTKEY_MASTER_KEY_FILE}`,
      );
      return {
        masterKey,
        source: 'env-file',
        filePath: process.env.VAULTKEY_MASTER_KEY_FILE,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to load master key from file ${process.env.VAULTKEY_MASTER_KEY_FILE}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 6. デフォルトファイル ~/.vaultkey/master.key
  if (fs.existsSync(DEFAULT_MASTER_KEY_FILE)) {
    try {
      const masterKey = readMasterKeyFromFile(DEFAULT_MASTER_KEY_FILE);
      console.log(
        `Master key loaded from default file: ${DEFAULT_MASTER_KEY_FILE}`,
      );
      return {
        masterKey,
        source: 'default-file',
        filePath: DEFAULT_MASTER_KEY_FILE,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to load master key from default file ${DEFAULT_MASTER_KEY_FILE}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // 7. 自動生成してデフォルトファイルに保存
  const masterKey = generateMasterKey();
  saveMasterKeyToFile(masterKey, DEFAULT_MASTER_KEY_FILE);
  console.log(
    `Master key generated and saved to default file: ${DEFAULT_MASTER_KEY_FILE}`,
  );

  return {
    masterKey,
    source: 'generated',
    filePath: DEFAULT_MASTER_KEY_FILE,
  };
};
