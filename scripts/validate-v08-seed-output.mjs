import fs from "node:fs";
import path from "node:path";

const runtimeDir = process.env.RUNTIME_DIR ?? path.resolve("runtime");
const seedOutputPath =
  process.env.SEED_OUTPUT_PATH ?? path.join(runtimeDir, "seed-output.json");

const seedOutput = readJson(seedOutputPath);
const failures = [];

const contracts = asRecord(seedOutput.contracts);
requireAddress(contracts.govCore, "contracts.govCore", failures);
requireAddress(contracts.govProposals, "contracts.govProposals", failures);
requireAddress(contracts.demoTarget, "contracts.demoTarget", failures);
optionalAddress(contracts.demoVotesToken, "contracts.demoVotesToken", failures);

const simple = asRecord(asRecord(seedOutput.organizations).simple);
const proposals = asRecord(simple.proposals);
const accountability = asRecord(simple.accountability);
const executedFeatureProposal = asRecord(accountability.executedFeatureProposal);
const pendingObligationProposal = asRecord(
  accountability.pendingObligationProposal,
);

requireNumericString(simple.orgId, "organizations.simple.orgId", failures);
requireNumericString(
  proposals.executedFeatureProposalId,
  "organizations.simple.proposals.executedFeatureProposalId",
  failures,
);
requireNumericString(
  proposals.pendingObligationProposalId,
  "organizations.simple.proposals.pendingObligationProposalId",
  failures,
);

requireAccountabilityProposal(
  executedFeatureProposal,
  "organizations.simple.accountability.executedFeatureProposal",
  {
    action: "setFeatureEnabled",
    status: "executed",
    proposalId: proposals.executedFeatureProposalId,
    requiredBytes32Field: "feature",
  },
  failures,
);
if (executedFeatureProposal.enabled !== true) {
  failures.push(
    "organizations.simple.accountability.executedFeatureProposal.enabled must be true",
  );
}

requireAccountabilityProposal(
  pendingObligationProposal,
  "organizations.simple.accountability.pendingObligationProposal",
  {
    action: "markObligationAccepted",
    status: "approved_not_executed",
    proposalId: proposals.pendingObligationProposalId,
    requiredBytes32Field: "obligationId",
  },
  failures,
);

const demoVotes = seedOutput.demoVotes;
if (demoVotes !== undefined) {
  const demoVotesRecord = asRecord(demoVotes);
  requireAddress(demoVotesRecord.token, "demoVotes.token", failures);
  if (contracts.demoVotesToken === undefined) {
    failures.push("demoVotes is present but contracts.demoVotesToken is missing");
  } else {
    compareAddress(
      "demoVotes.token",
      demoVotesRecord.token,
      contracts.demoVotesToken,
      failures,
    );
  }
  if (demoVotesRecord.delegated !== true) {
    failures.push("demoVotes.delegated must be true when demoVotes is present");
  }
  const holders = asRecord(demoVotesRecord.holders);
  const holderEntries = Object.entries(holders);
  if (holderEntries.length === 0) {
    failures.push("demoVotes.holders must include at least one holder");
  }
  for (const [holderKey, holderAddress] of holderEntries) {
    requireAddress(holderAddress, `demoVotes.holders.${holderKey}`, failures);
  }
} else if (contracts.demoVotesToken !== undefined) {
  failures.push("contracts.demoVotesToken is present but demoVotes is missing");
}

if (failures.length > 0) {
  throw new Error(
    `v0.8 seed-output validation failed:\n- ${failures.join("\n- ")}`,
  );
}

console.log("[v0.8-seed-output] minimum v0.8 seed shape is valid");

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

function requireAccountabilityProposal(record, label, expected, failures) {
  requireNumericString(record.proposalId, `${label}.proposalId`, failures);
  if (record.proposalId !== undefined && record.proposalId !== expected.proposalId) {
    failures.push(
      `${label}.proposalId ${record.proposalId} does not match ${expected.proposalId}`,
    );
  }
  if (record.action !== expected.action) {
    failures.push(`${label}.action must be ${expected.action}`);
  }
  if (record.status !== expected.status) {
    failures.push(`${label}.status must be ${expected.status}`);
  }
  requireBytes32(
    record[expected.requiredBytes32Field],
    `${label}.${expected.requiredBytes32Field}`,
    failures,
  );
}

function requireNumericString(value, label, failures) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    failures.push(`${label} must be a decimal string`);
  }
}

function requireBytes32(value, label, failures) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    failures.push(`${label} must be a bytes32 hex string`);
  }
}

function requireAddress(value, label, failures) {
  if (!isAddress(value)) {
    failures.push(`${label} must be an EVM address`);
  }
}

function optionalAddress(value, label, failures) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  requireAddress(value, label, failures);
}

function compareAddress(label, actual, expected, failures) {
  if (!isAddress(actual) || !isAddress(expected)) {
    return;
  }
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    failures.push(`${label} ${actual} does not match ${expected}`);
  }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function isAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}
