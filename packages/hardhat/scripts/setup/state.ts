import * as fs from "fs";
import * as path from "path";

const STATE_FILE = path.join(__dirname, "setup-state.json");

export interface SetupState {
  schemaVersion: 1;
  network: string;
  steps: {
    validate?: { done: boolean; timestamp: string };
    provisionAts?: {
      done: boolean;
      atsTokenAddress: string;
      timestamp: string;
    };
    provisionPaymentToken?: {
      done: boolean;
      paymentTokenAddress: string;
      timestamp: string;
    };
    prepareParticipants?: { done: boolean; timestamp: string };
    deploySettlement?: {
      done: boolean;
      contractAddress: string;
      txHash: string;
      timestamp: string;
    };
    grantAllowances?: { done: boolean; timestamp: string };
    runExchange?: {
      done: boolean;
      successTxHash: string;
      timestamp: string;
    };
  };
}

const DEFAULT_STATE: SetupState = {
  schemaVersion: 1,
  network: "hederaTestnet",
  steps: {},
};

/**
 * Synchronously read the setup state file.
 * Returns the default state if the file does not exist.
 */
export function readState(): SetupState {
  if (!fs.existsSync(STATE_FILE)) {
    return { ...DEFAULT_STATE, steps: {} };
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw) as SetupState;
  } catch {
    console.warn("setup-state.json is corrupted — starting fresh.");
    return { ...DEFAULT_STATE, steps: {} };
  }
}

/**
 * Synchronously merge-write a step's data into the state file.
 * Preserves existing step data for other steps.
 */
export function writeStep(
  stepName: keyof SetupState["steps"],
  data: object
): void {
  const state = readState();
  (state.steps as Record<string, object>)[stepName] = {
    ...(state.steps[stepName] ?? {}),
    ...data,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  console.log(`✓ State updated: ${stepName}`);
}
