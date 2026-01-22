/**
 * Multi-Agent Orchestrator
 *
 * Coordinates the Lead, Dev, and QA agents to handle code change requests.
 * The orchestrator manages the workflow:
 * 1. User request -> Lead Agent (planning)
 * 2. Lead Agent -> Dev Agents (implementation)
 * 3. Dev Agents -> QA Agent (validation)
 * 4. QA Agent -> Lead Agent (review)
 * 5. Lead Agent -> User (approval)
 */

import { query, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { agentDefinitions } from "./agents/definitions.js";
import chalk from "chalk";

export interface OrchestratorOptions {
  projectPath: string;
  verbose?: boolean;
  autoApprove?: boolean;
}

export interface OrchestratorResult {
  success: boolean;
  sessionId?: string;
  summary: string;
  changes: string[];
  errors: string[];
}

/**
 * Formats and prints a message from an agent
 */
function printAgentMessage(agentName: string, message: string): void {
  const colors: Record<string, typeof chalk.blue> = {
    lead: chalk.blue,
    "components-dev": chalk.green,
    "services-dev": chalk.yellow,
    "screens-dev": chalk.magenta,
    qa: chalk.cyan,
  };

  const color = colors[agentName] || chalk.white;
  const prefix = color(`[${agentName.toUpperCase()}]`);
  console.log(`${prefix} ${message}`);
}

/**
 * Extracts text content from an SDK message
 */
function extractMessageContent(message: SDKMessage): string | null {
  if (message.type === "assistant" && message.message.content) {
    const content = message.message.content;
    if (Array.isArray(content)) {
      return content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    }
  }
  if (message.type === "result" && "result" in message) {
    return message.result;
  }
  return null;
}

/**
 * Main orchestration function
 * Runs the multi-agent workflow for a given user request
 */
export async function orchestrate(
  userRequest: string,
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const { projectPath, verbose = false } = options;

  console.log(chalk.bold("\n=== Multi-Agent Development System ===\n"));
  console.log(chalk.gray(`Project: ${projectPath}`));
  console.log(chalk.gray(`Request: ${userRequest}\n`));

  const changes: string[] = [];
  const errors: string[] = [];
  let sessionId: string | undefined;

  // Configure query options with all agents available
  const queryOptions: Options = {
    cwd: projectPath,
    allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "Task"],
    agents: agentDefinitions,
    permissionMode: "default",
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: `
You are orchestrating a multi-agent development system. You have access to specialized agents:

AVAILABLE AGENTS (use via Task tool with subagent_type):
- "lead": Lead Agent - Plans changes and coordinates work
- "components-dev": Components Developer - UI components specialist
- "services-dev": Services Developer - API and service layer specialist
- "screens-dev": Screens Developer - Full-page screen specialist
- "qa": QA Agent - Validates changes and runs tests

WORKFLOW:
1. First, delegate to the "lead" agent to analyze and plan the request
2. The lead agent will coordinate with dev agents for implementation
3. The lead agent will use the QA agent for validation
4. Present the final summary to the user

Start by delegating the user's request to the lead agent.
`
    },
    settingSources: ["project"], // Load CLAUDE.md if present
  };

  try {
    console.log(chalk.yellow("Starting orchestration...\n"));

    // Create the orchestrator prompt that starts the workflow
    const orchestratorPrompt = `
The user has requested the following change:

"${userRequest}"

Please delegate this to the lead agent to analyze, plan, and coordinate the implementation.
Use the Task tool with subagent_type="lead" to start the workflow.

The lead agent will:
1. Analyze the request
2. Create a plan
3. Coordinate with dev agents (components-dev, services-dev, screens-dev)
4. Run QA validation
5. Report back with results

Start now.
`;

    // Run the main query
    for await (const message of query({
      prompt: orchestratorPrompt,
      options: queryOptions,
    })) {
      // Capture session ID
      if (message.type === "system" && message.subtype === "init") {
        sessionId = message.session_id;
        if (verbose) {
          console.log(chalk.gray(`Session: ${sessionId}`));
        }
      }

      // Handle assistant messages
      if (message.type === "assistant") {
        const content = extractMessageContent(message);
        if (content && verbose) {
          // Determine which agent is speaking based on parent_tool_use_id
          const agentName = message.parent_tool_use_id ? "subagent" : "orchestrator";
          printAgentMessage(agentName, content.substring(0, 200) + (content.length > 200 ? "..." : ""));
        }
      }

      // Handle final result
      if (message.type === "result") {
        if (message.subtype === "success") {
          console.log(chalk.green("\n=== Orchestration Complete ===\n"));
          console.log(message.result);

          return {
            success: true,
            sessionId,
            summary: message.result,
            changes,
            errors,
          };
        } else {
          // Error occurred - check for errors array
          const errorMessage = message as { errors?: string[] };
          if (errorMessage.errors && Array.isArray(errorMessage.errors)) {
            errors.push(...errorMessage.errors);
          }
          console.log(chalk.red("\n=== Orchestration Failed ===\n"));
          console.log(chalk.red(errors.join("\n")));

          return {
            success: false,
            sessionId,
            summary: "Orchestration failed with errors",
            changes,
            errors,
          };
        }
      }
    }

    return {
      success: false,
      summary: "Orchestration ended without result",
      changes,
      errors: ["No result received from orchestration"],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`\nError: ${errorMessage}`));

    return {
      success: false,
      summary: "Orchestration failed with exception",
      changes,
      errors: [errorMessage],
    };
  }
}

/**
 * Resume a previous session
 */
export async function resumeSession(
  sessionId: string,
  followUpRequest: string,
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const { projectPath, verbose = false } = options;

  console.log(chalk.bold("\n=== Resuming Session ===\n"));
  console.log(chalk.gray(`Session: ${sessionId}`));
  console.log(chalk.gray(`Follow-up: ${followUpRequest}\n`));

  const changes: string[] = [];
  const errors: string[] = [];

  const queryOptions: Options = {
    cwd: projectPath,
    resume: sessionId,
    allowedTools: ["Read", "Edit", "Write", "Glob", "Grep", "Bash", "Task"],
    agents: agentDefinitions,
    permissionMode: "default",
  };

  try {
    for await (const message of query({
      prompt: followUpRequest,
      options: queryOptions,
    })) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          return {
            success: true,
            sessionId,
            summary: message.result,
            changes,
            errors,
          };
        } else {
          // Error occurred - check for errors array
          const errorMessage = message as { errors?: string[] };
          if (errorMessage.errors && Array.isArray(errorMessage.errors)) {
            errors.push(...errorMessage.errors);
          }
          return {
            success: false,
            sessionId,
            summary: "Follow-up failed",
            changes,
            errors,
          };
        }
      }
    }

    return {
      success: false,
      sessionId,
      summary: "Session ended without result",
      changes,
      errors: ["No result received"],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      sessionId,
      summary: "Session failed with exception",
      changes,
      errors: [errorMessage],
    };
  }
}
