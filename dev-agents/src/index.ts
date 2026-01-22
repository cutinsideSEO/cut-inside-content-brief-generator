#!/usr/bin/env node
/**
 * Multi-Agent Development System - CLI Entry Point
 *
 * Usage:
 *   npm start                    # Interactive mode
 *   npm start "your request"     # Direct request mode
 *
 * Examples:
 *   npm start "Add dark mode support"
 *   npm start "Refactor App.tsx to use useReducer"
 *   npm start "Fix TypeScript errors in geminiService"
 */

import * as readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { orchestrate, resumeSession, type OrchestratorResult } from "./orchestrator.js";
import path from "path";
import { fileURLToPath } from "url";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project path is parent of dev-agents folder
const PROJECT_PATH = path.resolve(__dirname, "..", "..");

// Track current session for follow-ups
let currentSessionId: string | undefined;

/**
 * Print the welcome banner
 */
function printBanner(): void {
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ${chalk.bold("Multi-Agent Development System")}                          ║
║   ${chalk.gray("Powered by Claude Agent SDK")}                              ║
║                                                              ║
║   ${chalk.yellow("Agents:")}                                                   ║
║   ${chalk.blue("Lead")} - Plans and coordinates changes                     ║
║   ${chalk.green("Components Dev")} - UI components specialist                ║
║   ${chalk.yellow("Services Dev")} - API/services specialist                   ║
║   ${chalk.magenta("Screens Dev")} - Full-page screens specialist              ║
║   ${chalk.cyan("QA")} - Validates and tests changes                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`));
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
${chalk.bold("Commands:")}
  ${chalk.cyan("help")}     - Show this help message
  ${chalk.cyan("exit")}     - Exit the program
  ${chalk.cyan("clear")}    - Clear the screen
  ${chalk.cyan("status")}   - Show current session status

${chalk.bold("Example Requests:")}
  ${chalk.gray(">")} Add dark mode toggle to the header
  ${chalk.gray(">")} Fix TypeScript errors in services
  ${chalk.gray(">")} Refactor Stage1 component for better readability
  ${chalk.gray(">")} Add a new export format to markdownService

${chalk.bold("How it works:")}
  1. You describe what you want to change
  2. Lead Agent analyzes and creates a plan
  3. Dev Agents implement the changes
  4. QA Agent validates the changes
  5. You review and approve
`);
}

/**
 * Process a user request through the multi-agent system
 */
async function processRequest(request: string): Promise<void> {
  const spinner = ora({
    text: "Starting multi-agent orchestration...",
    color: "cyan",
  }).start();

  try {
    let result: OrchestratorResult;

    // If we have a session, offer to continue
    if (currentSessionId) {
      spinner.text = "Continuing session...";
      result = await resumeSession(currentSessionId, request, {
        projectPath: PROJECT_PATH,
        verbose: true,
      });
    } else {
      spinner.text = "Analyzing request with Lead Agent...";
      result = await orchestrate(request, {
        projectPath: PROJECT_PATH,
        verbose: true,
      });
    }

    spinner.stop();

    // Store session for potential follow-ups
    if (result.sessionId) {
      currentSessionId = result.sessionId;
    }

    // Print result summary
    if (result.success) {
      console.log(chalk.green("\n✓ Changes completed successfully!\n"));
    } else {
      console.log(chalk.red("\n✗ Some issues occurred:\n"));
      result.errors.forEach((err) => console.log(chalk.red(`  - ${err}`)));
    }
  } catch (error) {
    spinner.stop();
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\nError: ${message}\n`));
  }
}

/**
 * Interactive CLI loop
 */
async function interactiveMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): void => {
    rl.question(chalk.cyan("\n> "), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands
      switch (trimmed.toLowerCase()) {
        case "help":
          printHelp();
          break;
        case "exit":
        case "quit":
          console.log(chalk.gray("\nGoodbye!\n"));
          rl.close();
          process.exit(0);
        case "clear":
          console.clear();
          printBanner();
          break;
        case "status":
          if (currentSessionId) {
            console.log(chalk.gray(`Current session: ${currentSessionId}`));
          } else {
            console.log(chalk.gray("No active session"));
          }
          break;
        default:
          // Process as a change request
          await processRequest(trimmed);
      }

      prompt();
    });
  };

  prompt();
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(chalk.red(`
Error: ANTHROPIC_API_KEY environment variable is not set.

To get started:
1. Get your API key from https://console.anthropic.com/
2. Set the environment variable:

   ${chalk.cyan("export ANTHROPIC_API_KEY=your-api-key")}

Or create a .env file with:
   ${chalk.cyan("ANTHROPIC_API_KEY=your-api-key")}
`));
    process.exit(1);
  }

  printBanner();
  console.log(chalk.gray(`Project: ${PROJECT_PATH}\n`));

  // Check if request was passed as argument
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const request = args.join(" ");
    console.log(chalk.gray(`Request: ${request}\n`));
    await processRequest(request);
    process.exit(0);
  }

  // Otherwise, run interactive mode
  console.log(chalk.gray('Type "help" for available commands, or describe what you want to change.\n'));
  await interactiveMode();
}

// Run the CLI
main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
