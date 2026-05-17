import fs from "node:fs";
import path from "node:path";

const runtimeDir = process.env.RUNTIME_DIR ?? path.resolve("runtime");
const deployedPath =
  process.env.DEPLOYED_ADDRESSES_PATH ??
  path.join(runtimeDir, "deployed-addresses.json");
const seedOutputPath =
  process.env.SEED_OUTPUT_PATH ?? path.join(runtimeDir, "seed-output.json");
const manifestPath =
  process.env.V08_ACCOUNTABILITY_MANIFEST_PATH ??
  path.join(runtimeDir, "v0.8-accountability-demo.json");

const deployed = readJson(deployedPath);
const seedOutput = readJson(seedOutputPath);
const contracts = normalizeContracts(deployed.contracts, seedOutput.contracts);
const simple = asRecord(asRecord(seedOutput.organizations).simple);
const accountability = asRecord(simple.accountability);
const executedFeatureProposal = asRecord(accountability.executedFeatureProposal);
const pendingObligationProposal = asRecord(
  accountability.pendingObligationProposal,
);
const demoVotesManifest =
  seedOutput.demoVotes === undefined
    ? undefined
    : {
        token: asRecord(seedOutput.demoVotes).token ?? null,
        delegated: asRecord(seedOutput.demoVotes).delegated === true,
        holders: asRecord(asRecord(seedOutput.demoVotes).holders),
        sourceLabel: "contract_state",
        trustBoundary: "onchain_observation",
        authorityClaim: "contract_authoritative",
        note:
          "Demo voting power is local seed data for v0.8 simulation and is not the ISO launch token.",
      };

const manifest = {
  schemaVersion: "isoniaos.v0.8.accountability-demo-manifest.v1",
  generatedAt: deployed.generatedAt ?? "unknown",
  chainId: deployed.chainId ?? seedOutput.chainId ?? 31337,
  runtimeVersions: readRuntimeVersions(deployed),
  contracts,
  sourceSeedOutput: relativeRuntimePath(seedOutputPath),
  organizations: [
    {
      key: "simple-dao-plus",
      orgId: stringOrNull(simple.orgId),
      sourceLabel: "contract_state",
      trustBoundary: "onchain_observation",
      authorityClaim: "contract_authoritative",
      scenarios: [
        buildExecutedFeatureScenario(executedFeatureProposal),
        buildPendingObligationScenario(pendingObligationProposal),
        buildExternalContextScenario(),
        buildManualAnnotationScenario(pendingObligationProposal),
      ],
    },
  ],
  ...(demoVotesManifest === undefined ? {} : { demoVotes: demoVotesManifest }),
};

writeJson(manifestPath, manifest);
console.log(`[v0.8-manifest] wrote ${manifestPath}`);

function buildExecutedFeatureScenario(record) {
  return {
    id: "approved-executed-completed-feature",
    title: "Approved, executed, completed feature action",
    kind: "onchain_executed_demo_action",
    proposalId: stringOrNull(record.proposalId),
    action: stringOrNull(record.action),
    status: stringOrNull(record.status),
    accountabilityExecutionStatus: "completed",
    feature: stringOrNull(record.feature),
    enabled: record.enabled === true,
    linkedTransaction: null,
    observedTransactionStatus: "unknown",
    sourceLabel: "contract_state",
    trustBoundary: "onchain_observation",
    authorityClaim: "contract_authoritative",
    executionProofNote:
      "The local seed executed the governed target action, but this manifest does not include a transaction hash until a read model or seed receipt capture provides it.",
  };
}

function buildPendingObligationScenario(record) {
  return {
    id: "approved-execution-accountability-pending",
    title: "Approved obligation action pending execution",
    kind: "approved_not_executed_demo_action",
    proposalId: stringOrNull(record.proposalId),
    action: stringOrNull(record.action),
    status: stringOrNull(record.status),
    accountabilityExecutionStatus: "not_started",
    obligationId: stringOrNull(record.obligationId),
    linkedTransaction: null,
    observedTransactionStatus: "unknown",
    sourceLabel: "contract_state",
    trustBoundary: "onchain_observation",
    authorityClaim: "contract_authoritative",
    executionProofNote:
      "The local seed approved this proposal but intentionally did not execute the governed target action.",
  };
}

function buildExternalContextScenario() {
  return {
    id: "fixture-backed-external-context",
    title: "Fixture-backed external context",
    kind: "external_context_fixture",
    externalResources: [
      {
        provider: "github",
        relation: "implementation_artifact",
        sourceLabel: "implementation_artifact",
        trustBoundary: "unverified_link",
        authorityClaim: "none",
        importStatus: "not_imported",
        url: "https://github.com/isoniaos/docs",
        note:
          "Static local fixture for context rendering only. No GitHub API is called and the link is not governance authority.",
      },
    ],
  };
}

function buildManualAnnotationScenario(record) {
  return {
    id: "manual-overdue-annotation-fixture",
    title: "Manual overdue annotation fixture",
    kind: "manual_accountability_annotation_fixture",
    proposalId: stringOrNull(record.proposalId),
    obligationId: stringOrNull(record.obligationId),
    accountabilityExecutionStatus: "blocked",
    sourceLabel: "manual_evidence",
    trustBoundary: "manual_context",
    authorityClaim: "none",
    importStatus: "not_imported",
    note:
      "Demo annotation only. It marks follow-through as needing attention for UI/API development and does not change protocol truth.",
  };
}

function normalizeContracts(deployedContracts, seedContracts) {
  const deployedRecord = asRecord(deployedContracts);
  const seedRecord = asRecord(seedContracts);
  return {
    govCoreAddress: deployedRecord.govCoreAddress ?? seedRecord.govCore ?? null,
    govProposalsAddress:
      deployedRecord.govProposalsAddress ?? seedRecord.govProposals ?? null,
    demoTargetAddress:
      deployedRecord.demoTargetAddress ?? seedRecord.demoTarget ?? null,
    ...(deployedRecord.demoVotesTokenAddress !== undefined ||
    seedRecord.demoVotesToken !== undefined
      ? {
          demoVotesTokenAddress:
            deployedRecord.demoVotesTokenAddress ??
            seedRecord.demoVotesToken ??
            null,
        }
      : {}),
  };
}

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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

function relativeRuntimePath(filePath) {
  const relative = path.relative(process.cwd(), filePath).replaceAll("\\", "/");
  return relative.startsWith("..") ? filePath.replaceAll("\\", "/") : relative;
}

function readRuntimeVersions(deployed) {
  const runtimeVersions = asRecord(deployed.runtimeVersions);
  const legacyVersions = asRecord(deployed.versions);
  return {
    appCore: stripTag(
      process.env.APP_CORE_VERSION ??
        runtimeVersions.appCore ??
        legacyVersions.appCore,
    ),
    controlPlane: stripTag(
      process.env.CONTROL_PLANE_VERSION ??
        runtimeVersions.controlPlane ??
        legacyVersions.controlPlane,
    ),
    evmContracts: stripTag(
      process.env.EVM_CONTRACTS_VERSION ??
        runtimeVersions.evmContracts ??
        legacyVersions.evmContracts,
    ),
  };
}

function stripTag(version) {
  return typeof version === "string" ? version.replace(/^v/, "") : null;
}
