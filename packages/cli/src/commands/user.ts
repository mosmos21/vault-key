import { Command } from 'commander';
import { VaultKeyClient } from '@mosmos_21/vault-key-core';
import prompts from 'prompts';
import open from 'open';
import { formatSuccess, formatError, formatInfo, tokenStorage } from '../utils';
import { startAuthServer } from '../server';

const DEFAULT_AUTH_PORT = 5432;

const getAuthPort = (): number => {
  const envPort = process.env.VAULTKEY_AUTH_PORT;
  if (envPort) {
    const port = parseInt(envPort, 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  return DEFAULT_AUTH_PORT;
};

type CommandOptions = {
  dbPath?: string;
  masterKey?: string;
  masterKeyFile?: string;
};

/**
 * Create user command
 */
export const createUserCommand = (): Command => {
  const command = new Command('user');

  command.description('User management');

  // register subcommand
  command
    .command('register')
    .description('Register a new user with Passkey')
    .option('--db-path <path>', 'Database file path')
    .option('--master-key <key>', 'Master key (64 character hex string)')
    .option('--master-key-file <path>', 'Master key file path')
    .action(async (options: CommandOptions) => {
      try {
        const response = await prompts({
          type: 'text',
          name: 'userId',
          message: 'Enter user ID:',
          validate: (value) =>
            value.trim().length > 0 ? true : 'User ID is required',
        });

        if (!response.userId) {
          console.error(formatError('User registration cancelled'));
          process.exit(1);
        }

        const userId = response.userId.trim();

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        console.log(formatInfo('Starting authentication server...'));
        console.log(
          formatInfo(`Please complete Passkey registration in the browser.`),
        );
        console.log(formatInfo(`URL: http://localhost:${getAuthPort()}`));

        // Open browser
        await open(`http://localhost:${getAuthPort()}`);

        const result = await startAuthServer({
          client,
          userId,
          port: getAuthPort(),
          mode: 'register',
        });

        client.close();

        if (result.success) {
          console.log(
            formatSuccess(`User "${userId}" registered successfully`),
          );
        } else {
          console.error(
            formatError(
              `User registration failed: ${result.error ?? 'Unknown error'}`,
            ),
          );
          process.exit(1);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`User registration failed: ${message}`));
        process.exit(1);
      }
    });

  // login subcommand
  command
    .command('login')
    .description('Login with Passkey and issue token')
    .option('--db-path <path>', 'Database file path')
    .option('--master-key <key>', 'Master key (64 character hex string)')
    .option('--master-key-file <path>', 'Master key file path')
    .action(async (options: CommandOptions) => {
      try {
        const response = await prompts({
          type: 'text',
          name: 'userId',
          message: 'Enter user ID:',
          validate: (value) =>
            value.trim().length > 0 ? true : 'User ID is required',
        });

        if (!response.userId) {
          console.error(formatError('Login cancelled'));
          process.exit(1);
        }

        const userId = response.userId.trim();

        const client = new VaultKeyClient({
          ...(options.dbPath ? { dbPath: options.dbPath } : {}),
          ...(options.masterKey ? { masterKey: options.masterKey } : {}),
          ...(options.masterKeyFile
            ? { masterKeyFile: options.masterKeyFile }
            : {}),
        });

        console.log(formatInfo('Starting authentication server...'));
        console.log(
          formatInfo(`Please complete Passkey authentication in the browser.`),
        );
        console.log(formatInfo(`URL: http://localhost:${getAuthPort()}`));

        // Open browser
        await open(`http://localhost:${getAuthPort()}`);

        const result = await startAuthServer({
          client,
          userId,
          port: getAuthPort(),
          mode: 'login',
        });

        client.close();

        if (result.success && result.token) {
          // Save token to file
          tokenStorage.save(result.token);

          console.log(formatSuccess('Login successful'));
          console.log(`Token saved to ~/.vaultkey/token`);
        } else {
          console.error(
            formatError(`Login failed: ${result.error ?? 'Unknown error'}`),
          );
          process.exit(1);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`Login failed: ${message}`));
        process.exit(1);
      }
    });

  // logout subcommand
  command
    .command('logout')
    .description('Logout and delete token file')
    .action(() => {
      try {
        tokenStorage.remove();
        console.log(formatSuccess('Logged out'));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(formatError(`Logout failed: ${message}`));
        process.exit(1);
      }
    });

  return command;
};
