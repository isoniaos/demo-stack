import fs from "node:fs";
import path from "node:path";

const runtimeDir = process.env.RUNTIME_DIR ?? path.resolve("runtime");
const requireSeed = process.argv.includes("--require-seed");

const deployedPath = path.join(runtimeDir, "deployed-addresses.json");
const controlPlaneEnvPath = path.join(runtimeDir, "control-plane.env");
const appConfigPath = path.join(runtimeDir, "isonia.config.json");
const seedOutputPath = path.join(runtimeDir, "seed-output.json");

const deployed = readJson(deployedPath);
const deployedContracts = readRuntimeContracts(
  deployed.contracts,
  deployedPath,
);
const failures = [];

compareIgnitionRaw(deployed.raw, deployedContracts, failures);

const controlPlaneEnv = parseEnvFile(controlPlaneEnvPath);
compareAddress(
  "control-plane.env GOV_CORE_ADDRESS",
  controlPlaneEnv.GOV_CORE_ADDRESS,
  deployedContracts.govCoreAddress,
  failures,
);
compareAddress(
  "control-plane.env GOV_PROPOSALS_ADDRESS",
  controlPlaneEnv.GOV_PROPOSALS_ADDRESS,
  deployedContracts.govProposalsAddress,
  failures,
);
rejectDeprecatedControlPlaneConfig(controlPlaneEnv, failures);

const appConfig = readJson(appConfigPath);
const appContracts = readRuntimeContracts(appConfig.contracts, appConfigPath);
compareContracts("isonia.config.json", appContracts, deployedContracts, failures);

if (fs.existsSync(seedOutputPath)) {
  const seedOutput = readJson(seedOutputPath);
  compareSeedContracts(seedOutput.contracts, deployedContracts, failures);
} else if (requireSeed) {
  failures.push(`Missing required seed output: ${seedOutputPath}`);
}

if (failures.length > 0) {
  throw new Error(
    `Runtime contract address validation failed:\n- ${failures.join("\n- ")}`,
  );
}

console.log("[runtime-addresses] contract addresses are consistent");

function readJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        // Fall through to the original parse error.
      }
    }
    throw new Error(`Unable to read JSON at ${filePath}: ${error.message}`);
  }
}

function readRuntimeContracts(value, source) {
  const contracts = asRecord(value);
  return {
    govCoreAddress: requireAddress(contracts.govCoreAddress, source, "govCoreAddress"),
    govProposalsAddress: requireAddress(
      contracts.govProposalsAddress,
      source,
      "govProposalsAddress",
    ),
    demoTargetAddress: requireAddress(
      contracts.demoTargetAddress,
      source,
      "demoTargetAddress",
    ),
    demoVotesTokenAddress: optionalAddress(
      contracts.demoVotesTokenAddress,
      source,
      "demoVotesTokenAddress",
    ),
  };
}

function compareIgnitionRaw(raw, expected, failures) {
  const rawContracts = asRecord(raw);
  compareAddress(
    "Ignition GovCore",
    rawContracts["IsoniaProtocolV01Module#GovCore"],
    expected.govCoreAddress,
    failures,
  );
  compareAddress(
    "Ignition GovProposals",
    rawContracts["IsoniaProtocolV01Module#GovProposals"],
    expected.govProposalsAddress,
    failures,
  );
  compareAddress(
    "Ignition DemoTarget",
    rawContracts["IsoniaProtocolV01Module#DemoTarget"],
    expected.demoTargetAddress,
    failures,
  );
  compareOptionalAddress(
    "Ignition IsoDemoVotesToken",
    firstAddress(rawContracts, [
      ["IsoniaProtocolV01Module#IsoDemoVotesToken"],
      ["contracts", "demoVotesTokenAddress"],
      ["contracts", "demoVotesToken"],
      ["IsoDemoVotesToken"],
      ["demoVotesTokenAddress"],
      ["demoVotesToken"],
    ]),
    expected.demoVotesTokenAddress,
    failures,
  );
}

function compareContracts(label, actual, expected, failures) {
  compareAddress(
    `${label} GovCore`,
    actual.govCoreAddress,
    expected.govCoreAddress,
    failures,
  );
  compareAddress(
    `${label} GovProposals`,
    actual.govProposalsAddress,
    expected.govProposalsAddress,
    failures,
  );
  compareAddress(
    `${label} DemoTarget`,
    actual.demoTargetAddress,
    expected.demoTargetAddress,
    failures,
  );
  compareOptionalAddress(
    `${label} IsoDemoVotesToken`,
    actual.demoVotesTokenAddress,
    expected.demoVotesTokenAddress,
    failures,
  );
}

function compareSeedContracts(seedContracts, expected, failures) {
  const contracts = asRecord(seedContracts);
  compareAddress(
    "seed-output.json GovCore",
    contracts.govCore,
    expected.govCoreAddress,
    failures,
  );
  compareAddress(
    "seed-output.json GovProposals",
    contracts.govProposals,
    expected.govProposalsAddress,
    failures,
  );
  compareAddress(
    "seed-output.json DemoTarget",
    contracts.demoTarget,
    expected.demoTargetAddress,
    failures,
  );
  compareOptionalAddress(
    "seed-output.json IsoDemoVotesToken",
    contracts.demoVotesToken,
    expected.demoVotesTokenAddress,
    failures,
  );
}

function rejectDeprecatedControlPlaneConfig(controlPlaneEnv, failures) {
  for (const name of ["EVM_CONTRACTS_VERSION", "DEMO_TARGET_ADDRESS"]) {
    if (controlPlaneEnv[name] !== undefined) {
      failures.push(`control-plane.env must not include deprecated ${name}`);
    }
  }

  if (
    typeof controlPlaneEnv.ISONIA_PROTOCOL_PROFILE !== "string" ||
    controlPlaneEnv.ISONIA_PROTOCOL_PROFILE === ""
  ) {
    failures.push(
      `control-plane.env ISONIA_PROTOCOL_PROFILE is missing or empty: ${String(
        controlPlaneEnv.ISONIA_PROTOCOL_PROFILE,
      )}`,
    );
  }

  const rawCapabilities = controlPlaneEnv.ISONIA_DEPLOYMENT_CAPABILITIES_JSON;
  try {
    const capabilities = JSON.parse(rawCapabilities);
    if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
      failures.push(
        "control-plane.env ISONIA_DEPLOYMENT_CAPABILITIES_JSON must be a JSON object",
      );
      return;
    }
    if (
      asRecord(asRecord(capabilities).execution).permissionRegistry !== true
    ) {
      failures.push(
        "control-plane.env ISONIA_DEPLOYMENT_CAPABILITIES_JSON.execution.permissionRegistry must be true",
      );
    }
  } catch (error) {
    failures.push(
      `control-plane.env ISONIA_DEPLOYMENT_CAPABILITIES_JSON is invalid JSON: ${error.message}`,
    );
  }
}

function compareAddress(label, actual, expected, failures) {
  if (!isAddress(actual)) {
    failures.push(`${label} is missing or invalid: ${String(actual)}`);
    return;
  }

  if (actual.toLowerCase() !== expected.toLowerCase()) {
    failures.push(`${label} ${actual} does not match expected ${expected}`);
  }
}

function compareOptionalAddress(label, actual, expected, failures) {
  const hasActual = actual !== undefined && actual !== null && actual !== "";
  const hasExpected = expected !== undefined && expected !== null && expected !== "";

  if (!hasActual && !hasExpected) {
    return;
  }

  if (hasActual && !isAddress(actual)) {
    failures.push(`${label} is present but invalid: ${String(actual)}`);
    return;
  }

  if (hasExpected && !isAddress(expected)) {
    failures.push(`${label} expected address is invalid: ${String(expected)}`);
    return;
  }

  if (hasActual !== hasExpected) {
    failures.push(
      `${label} presence mismatch: actual ${String(actual)}, expected ${String(expected)}`,
    );
    return;
  }

  if (actual.toLowerCase() !== expected.toLowerCase()) {
    failures.push(`${label} ${actual} does not match expected ${expected}`);
  }
}

function parseEnvFile(filePath) {
  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }
    const name = trimmed.slice(0, equalsIndex);
    result[name] = unquoteShellValue(trimmed.slice(equalsIndex + 1));
  }
  return result;
}

function unquoteShellValue(value) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("'\\''", "'");
  }
  return value;
}

function requireAddress(value, source, field) {
  if (!isAddress(value)) {
    throw new Error(`${source} is missing valid ${field}`);
  }
  return value;
}

function optionalAddress(value, source, field) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (!isAddress(value)) {
    throw new Error(`${source} has invalid optional ${field}: ${String(value)}`);
  }
  return value;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function isAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function firstAddress(value, paths) {
  for (const candidatePath of paths) {
    const candidate = getPath(value, candidatePath);
    if (candidate !== undefined) {
      return candidate;
    }
  }
  return undefined;
}

function getPath(value, keys) {
  let current = value;
  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}
