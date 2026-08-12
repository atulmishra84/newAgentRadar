const {
  DISCOVERY_AI_ONLY,
  classifyAzureResource,
  isAzureAiResource,
  shouldIngestAiOnly
} = require("./aiRelevance.js");
const {
  sanitizeAzureError,
  parseResourceId,
  emptyAgentBlock,
  emptyRuntimeBlock,
  normalizeRuntimeStatus,
  discoverCognitiveAgents,
  getContainerApp,
  listContainerAppRevisions,
  getWebSite,
  getVmInstanceView,
  getAksCluster,
  listAksAiWorkloads,
  extractSafeAppSignals,
  isHeuristicAiWorkload,
  powerStateFromInstanceView
} = require("./azureDeepScan.js");

// IPv4 forced fetch for Azure endpoints that fail on IPv6
function fetchIPv4(url, options = {}) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      family: 4
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data || '{}'))
          });
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, json: () => Promise.resolve({}) });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function assertAllowedUrl() {} // shim
const ALLOW = { microsoftLogin: true, azureArm: true }; // shim
const safeFetch = fetchIPv4; // use fetchIPv4 directly

const MAX_RESOURCES = Number(
  process.env.AZURE_DISCOVERY_MAX_RESOURCES || process.env.DISCOVERY_MAX_RESOURCES || 500
);

const AZURE_DISCOVERY_AGENT_SCAN =
  String(process.env.AZURE_DISCOVERY_AGENT_SCAN || "true").toLowerCase() !== "false";

const AZURE_DISCOVERY_RUNTIME_SCAN =
  String(process.env.AZURE_DISCOVERY_RUNTIME_SCAN || "true").toLowerCase() !== "false";

const EFFECTIVE_AZURE_AI_ONLY =
  process.env.AZURE_DISCOVERY_AI_ONLY != null
    ? String(process.env.AZURE_DISCOVERY_AI_ONLY).toLowerCase() !== "false"
    : DISCOVERY_AI_ONLY;

function isAiRelevant(resource) {
  return isAzureAiResource(resource);
}

const ARM_SCOPE = "https://management.azure.com/.default";
const AI_DATA_SCOPE = "https://ai.azure.com/.default";
const COGNITIVE_SCOPE = "https://cognitiveservices.azure.com/.default";

async function getAzureAccessToken({ tenantId, clientId, clientSecret, scope = ARM_SCOPE }) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope
  }).toString();

  const res = await safeFetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      sanitizeAzureError(json.error_description || json.error || `Azure token failed (${res.status})`)
    );
  }
  return json.access_token;
}

async function getOptionalToken(creds, scope) {
  try {
    return await getAzureAccessToken({ ...creds, scope });
  } catch {
    return null;
  }
}

async function listSubscriptionResources(token, subscriptionId) {
  const resources = [];
  let url =
    `https://management.azure.com/subscriptions/${subscriptionId}/resources` +
    `?api-version=2021-04-01`;

  while (url) {
    const res = await safeFetch(
      url,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        sanitizeAzureError(json.error?.message || `Azure resource list failed (${res.status})`)
      );
    }
    resources.push(...(json.value || []));
    url = json.nextLink || null;
  }
  return resources;
}

function baseObservationFields(conn) {
  return {
    collector_id: "cloud_azure",
    category: "cloud",
    cloud_provider: "azure",
    provider: "azure",
    deployment_type: "cloud"
  };
}

function buildAgentAndRuntime({
  agentDetected = false,
  detectionMethod = null,
  agentId = null,
  agentName = null,
  agentType = null,
  agentStatus = null,
  agentRuntimeStatus = null,
  deploymentStatus = null,
  lastSeenAt = null,
  source = null,
  runtimeDetected = false,
  runtimeStatus = null,
  runtimeType = null,
  runtimeId = null,
  runtimeName = null,
  resourceId = null,
  region = null
} = {}) {
  return {
    agent: emptyAgentBlock({
      detected: agentDetected,
      detectionMethod,
      agentId,
      agentName,
      agentType,
      agentStatus,
      runtimeStatus: agentRuntimeStatus,
      deploymentStatus,
      lastSeenAt,
      source
    }),
    runtime: emptyRuntimeBlock({
      detected: runtimeDetected,
      status: runtimeStatus,
      runtimeType,
      runtimeId,
      runtimeName,
      resourceId,
      region
    })
  };
}

function resourceToObservation(resource, conn, classification, extras = {}) {
  const tags = resource.tags || {};
  const type = resource.type || "unknown";
  const shortType = type.split("/").slice(-1)[0];
  const displayName = resource.name || shortType;
  const aiRelevant = classification?.aiRelevant === true;
  const category = classification?.category || (aiRelevant ? "unknown_ai_resource" : "non_ai");
  const parsed = parseResourceId(resource.id);

  const agentRuntime = extras.agentRuntime || buildAgentAndRuntime();
  const agent = agentRuntime.agent;
  const runtime = agentRuntime.runtime;

  let runningStatus = "unknown";
  if (runtime.detected && runtime.status) {
    runningStatus = runtime.status;
  }
  if (extras.runningStatus) runningStatus = extras.runningStatus;

  const evidence = [
    ...(classification?.evidence || []),
    ...(extras.evidence || [])
  ];

  let confidence = classification?.confidence ?? (aiRelevant ? 0.8 : 0.7);
  if (typeof extras.confidence === "number") confidence = extras.confidence;

  let legacyAgentStatus = null;
  if (agent.detected) {
    legacyAgentStatus =
      agent.detectionMethod === "runtime_heuristic" || agent.detectionMethod === "name_heuristic"
        ? "candidate"
        : "confirmed";
  }

  const inventoryClass = extras.inventoryClass
    || (agent.detected
      ? "ai_cloud_agent"
      : aiRelevant
        ? "ai_cloud_resource"
        : "cloud_resource");

  let evidenceClass = null;
  if (agent.detected && legacyAgentStatus === "confirmed") evidenceClass = "cloud_ai_runtime";
  else if (agent.detected) evidenceClass = "cloud_ai_runtime";
  else if (aiRelevant && classification?.layer === "ai_resource") evidenceClass = null;

  const relationships = extras.relationships || [
    {
      rel_type: "DEPLOYED_IN",
      to_type: "CloudResource",
      to_key: resource.id,
      to_name: displayName
    },
    {
      rel_type: "HOSTED_BY",
      to_type: "CloudResource",
      to_key: resource.id,
      to_name: displayName
    }
  ];

  return {
    ...baseObservationFields(conn),
    fingerprint: extras.fingerprint || `azure:${resource.id}`,
    name: extras.name || (aiRelevant ? `${displayName} (AI)` : displayName),
    region: resource.location || null,
    endpoint: resource.id,
    running_status: runningStatus,
    confidence_score: confidence,
    owner: tags.owner || tags.Owner || null,
    department: tags.department || tags.Department || null,
    business_unit: tags.businessUnit || tags.bu || null,
    framework: extras.framework || shortType,
    model: extras.model || (agent.detected ? "azure-ai-agent" : aiRelevant ? "ai-relevant" : null),
    agent,
    runtime,
    metadata: {
      connectorId: conn.id,
      connectorName: conn.name,
      discoveryMode: extras.discoveryMode || "azure-arm-live",
      discoveryLayer: extras.discoveryLayer || classification?.layer || "resource",
      subscriptionId: conn.config.subscriptionId,
      tenantId: conn.config.tenantId || null,
      azureResourceId: resource.id,
      azureType: type,
      azureKind: resource.kind || null,
      resourceGroup: parsed.resourceGroup,
      aiRelevant,
      aiResourceType: category,
      agentDetected: agent.detected,
      agentDetectionMethod: agent.detectionMethod,
      runtimeDetected: runtime.detected,
      runtimeType: runtime.runtimeType,
      runtimeStatus: runtime.status,
      evidenceClass,
      evidence,
      inventoryClass,
      agentStatus: legacyAgentStatus,
      managedCloudAgent: Boolean(
        agent.detected &&
          agent.detectionMethod &&
          /azure_foundry_api|azure_assistants_api|azure_bot_service_arm/.test(agent.detectionMethod)
      ),
      discoveryStatus: extras.discoveryStatus || null,
      runtimeStatusReason: extras.runtimeStatusReason || null,
      tags,
      ...((extras.metadata && typeof extras.metadata === "object") ? extras.metadata : {})
    },
    relationships
  };
}

function agentObservationFromFinding(finding, resource, conn, classification) {
  const agentId = finding.agentId;
  const runtimeDetected = finding.runtimeStatus && finding.runtimeStatus !== "unknown"
    ? true
    : Boolean(finding.containerAppId);
  const agentRuntime = buildAgentAndRuntime({
    agentDetected: true,
    detectionMethod: finding.detectionMethod,
    agentId,
    agentName: finding.agentName,
    agentType: finding.agentType,
    agentStatus: finding.agentStatus,
    agentRuntimeStatus: finding.runtimeStatus || "unknown",
    deploymentStatus: finding.deploymentStatus,
    lastSeenAt: finding.lastSeenAt,
    source: finding.source,
    runtimeDetected,
    runtimeStatus: finding.runtimeStatus || "unknown",
    runtimeType: finding.containerAppId
      ? "azure_container_app"
      : /hosted|container_app/i.test(String(finding.agentType || ""))
        ? "azure_foundry_hosted"
        : "azure_foundry_agent",
    runtimeId: finding.containerAppId || agentId,
    runtimeName: finding.agentName,
    resourceId: resource.id,
    region: finding.region || resource.location || null
  });

  const relationships = [
    {
      rel_type: "HOSTED_BY",
      to_type: "CloudResource",
      to_key: resource.id,
      to_name: resource.name
    },
    {
      rel_type: "DEPLOYED_IN",
      to_type: "CloudResource",
      to_key: resource.id,
      to_name: resource.name
    }
  ];
  if (finding.containerAppId) {
    relationships.push({
      rel_type: "RUNS_ON",
      to_type: "AzureRuntime",
      to_key: finding.containerAppId,
      to_name: finding.agentName
    });
  }

  return resourceToObservation(resource, conn, classification, {
    fingerprint: `azure-agent:${conn.config.subscriptionId}:${agentId}`,
    name: `${finding.agentName || agentId} (Azure Agent)`,
    framework: finding.agentType || "azure-agent",
    model: finding.agentType || "azure-foundry-agent",
    confidence: finding.confidence,
    evidence: finding.evidence,
    discoveryMode: "azure-agent-api",
    discoveryLayer: "agent",
    inventoryClass: "ai_cloud_agent",
    runningStatus: "unknown",
    runtimeStatusReason: finding.runtimeReason || null,
    agentRuntime,
    relationships,
    metadata: {
      projectName: finding.projectName || null,
      projectEndpoint: finding.projectEndpoint || null,
      foundrySource: finding.source
    }
  });
}

function botServiceObservation(resource, conn, classification) {
  const agentId = resource.id;
  const agentRuntime = buildAgentAndRuntime({
    agentDetected: true,
    detectionMethod: "azure_bot_service_arm",
    agentId,
    agentName: resource.name,
    agentType: "azure_bot_service",
    agentStatus: "confirmed",
    agentRuntimeStatus: "unknown",
    deploymentStatus: null,
    lastSeenAt: null,
    source: "azure_bot_service",
    runtimeDetected: false,
    runtimeStatus: "unknown",
    runtimeType: null,
    runtimeId: null,
    runtimeName: null,
    resourceId: resource.id,
    region: resource.location || null
  });

  return resourceToObservation(resource, conn, classification, {
    fingerprint: `azure-agent:${conn.config.subscriptionId}:${agentId}`,
    name: `${resource.name} (Azure Bot)`,
    confidence: 0.95,
    evidence: [
      ...(classification.evidence || []),
      "Azure Bot Service bot resource returned by ARM",
      "ARM does not expose live bot conversation runtime state"
    ],
    discoveryMode: "azure-arm-bot",
    discoveryLayer: "agent",
    inventoryClass: "ai_cloud_agent",
    runtimeStatusReason: "Bot Service ARM resource has no continuous runtime status",
    agentRuntime
  });
}

async function discoverContainerAppRuntime(token, resource, conn, classification, discoveryErrors) {
  const observations = [];
  const detail = await getContainerApp(token, resource);
  if (!detail.ok) {
    discoveryErrors.push({
      resourceId: resource.id,
      discoveryType: "container-app",
      discoveryStatus: detail.permissionDenied ? "permission_denied" : "error",
      error: detail.error
    });
    return observations;
  }

  const app = detail.json;
  const signals = extractSafeAppSignals(app);
  const revisions = await listContainerAppRevisions(token, resource);
  if (!revisions.ok && revisions.permissionDenied) {
    discoveryErrors.push({
      resourceId: resource.id,
      discoveryType: "container-app-revisions",
      discoveryStatus: "permission_denied",
      error: revisions.error
    });
  }

  const active = (revisions.revisions || []).filter((r) => r.properties?.active);
  let runtimeStatus = "unknown";
  const runningState = app.properties?.runningStatus || signals.runningStatus;
  if (runningState) runtimeStatus = normalizeRuntimeStatus(runningState);
  else if (active.some((r) => Number(r.properties?.replicas || 0) > 0)) runtimeStatus = "running";
  else if (active.length && active.every((r) => Number(r.properties?.replicas || 0) === 0)) {
    runtimeStatus = "stopped";
  }

  const heuristic = isHeuristicAiWorkload(signals, resource);
  const agentDetected = heuristic;
  const agentRuntime = buildAgentAndRuntime({
    agentDetected,
    detectionMethod: agentDetected ? "runtime_heuristic" : null,
    agentId: agentDetected ? resource.id : null,
    agentName: agentDetected ? resource.name : null,
    agentType: agentDetected ? "container_app_workload" : null,
    agentStatus: agentDetected ? "candidate" : null,
    agentRuntimeStatus: agentDetected ? "unknown" : null,
    deploymentStatus: runningState || null,
    lastSeenAt: null,
    source: agentDetected ? "azure_container_app_heuristic" : null,
    runtimeDetected: true,
    runtimeStatus,
    runtimeType: "azure_container_app",
    runtimeId: resource.id,
    runtimeName: resource.name,
    resourceId: resource.id,
    region: resource.location || null
  });

  observations.push(
    resourceToObservation(resource, conn, classification, {
      fingerprint: `azure-runtime:${resource.id}`,
      name: heuristic ? `${resource.name} (AI Container App)` : resource.name,
      confidence: agentDetected ? 0.72 : classification.confidence,
      evidence: [
        ...(classification.evidence || []),
        `Container App runningStatus=${runningState || "unknown"}`,
        agentDetected
          ? "Heuristic AI signals from image/env names/tags (values redacted)"
          : "No reliable agent evidence beyond compute host",
        "Container App running does not confirm an AI agent is running"
      ],
      discoveryMode: "azure-container-apps",
      discoveryLayer: agentDetected ? "agent_candidate" : "runtime",
      inventoryClass: agentDetected ? "ai_cloud_agent" : "ai_cloud_resource",
      runningStatus: runtimeStatus,
      runtimeStatusReason: agentDetected
        ? "Runtime is running but agent identity is heuristic only"
        : null,
      agentRuntime,
      metadata: {
        envNames: signals.envNames,
        images: signals.images,
        activeRevisionCount: active.length,
        latestRevisionName: signals.latestRevisionName
      },
      relationships: [
        {
          rel_type: "HOSTED_BY",
          to_type: "CloudResource",
          to_key: resource.id,
          to_name: resource.name
        },
        {
          rel_type: "RUNS_ON",
          to_type: "AzureRuntime",
          to_key: resource.id,
          to_name: resource.name
        }
      ]
    })
  );

  return observations;
}

async function discoverWebAppRuntime(token, resource, conn, classification, discoveryErrors) {
  const observations = [];
  const detail = await getWebSite(token, resource);
  if (!detail.ok) {
    discoveryErrors.push({
      resourceId: resource.id,
      discoveryType: classification.category === "azure_function" ? "function-app" : "app-service",
      discoveryStatus: detail.permissionDenied ? "permission_denied" : "error",
      error: detail.error
    });
    return observations;
  }

  const site = detail.json;
  const signals = extractSafeAppSignals(site);
  const state = site.properties?.state || site.properties?.availabilityState || null;
  const runtimeStatus = normalizeRuntimeStatus(state === "Running" ? "running" : state);
  const heuristic = isHeuristicAiWorkload(signals, resource) || classification.aiRelevant;
  const isFunction = /functionapp/i.test(String(site.kind || resource.kind || ""));
  const runtimeType = isFunction ? "azure_function" : "azure_app_service";

  const agentDetected = heuristic;
  const agentRuntime = buildAgentAndRuntime({
    agentDetected,
    detectionMethod: agentDetected ? "runtime_heuristic" : null,
    agentId: agentDetected ? resource.id : null,
    agentName: agentDetected ? resource.name : null,
    agentType: agentDetected ? (isFunction ? "function_app_workload" : "app_service_workload") : null,
    agentStatus: agentDetected ? "candidate" : null,
    agentRuntimeStatus: agentDetected ? "unknown" : null,
    deploymentStatus: state,
    source: agentDetected ? `azure_${runtimeType}_heuristic` : null,
    runtimeDetected: true,
    runtimeStatus,
    runtimeType,
    runtimeId: resource.id,
    runtimeName: resource.name,
    resourceId: resource.id,
    region: resource.location || null
  });

  observations.push(
    resourceToObservation(resource, conn, classification, {
      fingerprint: `azure-runtime:${resource.id}`,
      confidence: agentDetected ? 0.7 : classification.confidence,
      evidence: [
        ...(classification.evidence || []),
        `${isFunction ? "Function App" : "App Service"} state=${state || "unknown"}`,
        "Secret app settings are not retrieved",
        agentDetected
          ? "Heuristic AI workload signals (name/kind/tags/stack)"
          : "No agent evidence"
      ],
      discoveryMode: isFunction ? "azure-functions" : "azure-app-service",
      discoveryLayer: agentDetected ? "agent_candidate" : "runtime",
      inventoryClass: agentDetected ? "ai_cloud_agent" : "ai_cloud_resource",
      runningStatus: runtimeStatus,
      runtimeStatusReason: agentDetected
        ? "App running status is not agent execution status"
        : null,
      agentRuntime,
      metadata: {
        kind: site.kind || resource.kind || null,
        linuxFx: signals.linuxFx,
        envNames: signals.envNames
      }
    })
  );

  return observations;
}

async function discoverVmRuntime(token, resource, conn, classification, discoveryErrors) {
  const observations = [];
  const view = await getVmInstanceView(token, resource);
  if (!view.ok) {
    discoveryErrors.push({
      resourceId: resource.id,
      discoveryType: "vm-instance-view",
      discoveryStatus: view.permissionDenied ? "permission_denied" : "error",
      error: view.error
    });
  }

  const power = view.ok ? powerStateFromInstanceView(view.json) : "unknown";
  const agentRuntime = buildAgentAndRuntime({
    agentDetected: classification.aiRelevant,
    detectionMethod: classification.aiRelevant ? "runtime_heuristic" : null,
    agentId: classification.aiRelevant ? resource.id : null,
    agentName: classification.aiRelevant ? resource.name : null,
    agentType: classification.aiRelevant ? "vm_workload_candidate" : null,
    agentStatus: classification.aiRelevant ? "candidate" : null,
    agentRuntimeStatus: classification.aiRelevant ? "unknown" : null,
    deploymentStatus: power,
    source: classification.aiRelevant ? "azure_vm_heuristic" : null,
    runtimeDetected: view.ok,
    runtimeStatus: power,
    runtimeType: "azure_vm",
    runtimeId: resource.id,
    runtimeName: resource.name,
    resourceId: resource.id,
    region: resource.location || null
  });

  observations.push(
    resourceToObservation(resource, conn, classification, {
      fingerprint: `azure-runtime:${resource.id}`,
      confidence: classification.aiRelevant ? 0.62 : 0.8,
      evidence: [
        ...(classification.evidence || []),
        view.ok
          ? `VM power state=${power}`
          : "VM instance view unavailable",
        "ARM cannot determine in-guest processes; agent runtime remains unknown"
      ],
      discoveryMode: "azure-vm",
      discoveryLayer: classification.aiRelevant ? "agent_candidate" : "runtime",
      inventoryClass: classification.aiRelevant ? "ai_cloud_agent" : "cloud_resource",
      runningStatus: power,
      runtimeStatusReason:
        "VM power state does not imply agent process status; no guest inspection performed",
      discoveryStatus: view.permissionDenied ? "permission_denied" : null,
      agentRuntime
    })
  );

  return observations;
}

async function discoverAksRuntime(token, resource, conn, classification, discoveryErrors) {
  const observations = [];
  const cluster = await getAksCluster(token, resource);
  if (!cluster.ok) {
    discoveryErrors.push({
      resourceId: resource.id,
      discoveryType: "aks-cluster",
      discoveryStatus: cluster.permissionDenied ? "permission_denied" : "error",
      error: cluster.error
    });
  }

  const powerState = cluster.json?.properties?.powerState?.code || cluster.json?.properties?.provisioningState;
  const clusterRuntimeStatus = normalizeRuntimeStatus(powerState);

  observations.push(
    resourceToObservation(resource, conn, classification, {
      fingerprint: `azure-runtime:${resource.id}`,
      confidence: classification.confidence,
      evidence: [
        ...(classification.evidence || []),
        `AKS cluster power/provisioning=${powerState || "unknown"}`,
        "Cluster existence alone does not confirm AI agents"
      ],
      discoveryMode: "azure-aks",
      discoveryLayer: "runtime",
      inventoryClass: "ai_cloud_resource",
      runningStatus: clusterRuntimeStatus,
      agentRuntime: buildAgentAndRuntime({
        agentDetected: false,
        runtimeDetected: true,
        runtimeStatus: clusterRuntimeStatus,
        runtimeType: "azure_aks",
        runtimeId: resource.id,
        runtimeName: resource.name,
        resourceId: resource.id,
        region: resource.location || null
      }),
      discoveryStatus: cluster.permissionDenied ? "permission_denied" : null
    })
  );

  const workloads = await listAksAiWorkloads(token, resource);
  if (!workloads.ok) {
    discoveryErrors.push({
      resourceId: resource.id,
      discoveryType: "aks-workloads",
      discoveryStatus: workloads.permissionDenied ? "permission_denied" : "error",
      error: workloads.error
    });
    return observations;
  }

  for (const wl of workloads.workloads || []) {
    const detectionMethod = "runtime_heuristic";
    const confidence = wl.nameOnlyAgentHint && !isAiRelevantText(wl.images.join(" "), wl.envNames.join(" "))
      ? 0.55
      : 0.7;
    const agentId = `${resource.id}:${wl.namespace}:${wl.name}`;
    const agentRuntime = buildAgentAndRuntime({
      agentDetected: true,
      detectionMethod,
      agentId,
      agentName: `${wl.namespace}/${wl.name}`,
      agentType: "aks_deployment",
      agentStatus: "candidate",
      agentRuntimeStatus: confidence >= 0.6 ? wl.status : "unknown",
      source: "azure_aks_heuristic",
      runtimeDetected: true,
      runtimeStatus: wl.status,
      runtimeType: "azure_aks_deployment",
      runtimeId: wl.uid || agentId,
      runtimeName: wl.name,
      resourceId: resource.id,
      region: resource.location || null
    });

    observations.push(
      resourceToObservation(resource, conn, classification, {
        fingerprint: `azure-agent:${conn.config.subscriptionId}:${agentId}`,
        name: `AKS ${wl.namespace}/${wl.name} (AI candidate)`,
        confidence,
        evidence: [
          "AKS deployment matched AI workload heuristics (images/labels/env names)",
          wl.nameOnlyAgentHint
            ? "Name contains 'agent' — insufficient alone for confirmation"
            : "AI signals beyond name alone",
          `Pod/deployment ready status=${wl.status}`,
          "Heuristic detection is never marked confirmed"
        ],
        discoveryMode: "azure-aks-workload",
        discoveryLayer: "agent_candidate",
        inventoryClass: "ai_cloud_agent",
        runningStatus: wl.status,
        runtimeStatusReason:
          "Workload running status reflects Kubernetes replicas, not confirmed agent identity",
        agentRuntime,
        metadata: {
          namespace: wl.namespace,
          images: wl.images,
          envNames: wl.envNames,
          labels: wl.labels
        },
        relationships: [
          {
            rel_type: "HOSTED_BY",
            to_type: "CloudResource",
            to_key: resource.id,
            to_name: resource.name
          },
          {
            rel_type: "RUNS_ON",
            to_type: "AzureRuntime",
            to_key: wl.uid || agentId,
            to_name: `${wl.namespace}/${wl.name}`
          },
          {
            rel_type: "RUNS_IN",
            to_type: "KubernetesNamespace",
            to_key: `${resource.id}:${wl.namespace}`,
            to_name: wl.namespace
          }
        ]
      })
    );
  }

  return observations;
}

function emptyStats() {
  return {
    totalResourcesScanned: 0,
    aiRelevantResources: 0,
    agentCandidates: 0,
    agentsDiscovered: 0,
    confirmedAgents: 0,
    heuristicAgents: 0,
    runtimesDiscovered: 0,
    runningRuntimes: 0,
    stoppedRuntimes: 0,
    unknownRuntimeStatus: 0,
    discoveryErrors: 0,
    nonAiResourcesSkipped: 0,
    cloudResourcesIngested: 0
  };
}

function tallyObservation(stats, obs) {
  if (obs.metadata?.inventoryClass === "connector_scan") return;
  stats.cloudResourcesIngested += 1;
  if (obs.agent?.detected) {
    stats.agentsDiscovered += 1;
    if (obs.metadata?.agentStatus === "confirmed") stats.confirmedAgents += 1;
    if (obs.metadata?.agentStatus === "candidate") {
      stats.heuristicAgents += 1;
      stats.agentCandidates += 1;
    }
  }
  if (obs.runtime?.detected) {
    stats.runtimesDiscovered += 1;
    if (obs.runtime.status === "running") stats.runningRuntimes += 1;
    else if (obs.runtime.status === "stopped") stats.stoppedRuntimes += 1;
    else stats.unknownRuntimeStatus += 1;
  }
}

function dedupeObservations(observations) {
  const byFp = new Map();
  for (const obs of observations) {
    const fp = obs.fingerprint;
    if (!byFp.has(fp)) {
      byFp.set(fp, obs);
      continue;
    }
    const prev = byFp.get(fp);
    const prevScore = Number(prev.confidence_score) || 0;
    const nextScore = Number(obs.confidence_score) || 0;
    const prevConfirmed = prev.metadata?.agentStatus === "confirmed";
    const nextConfirmed = obs.metadata?.agentStatus === "confirmed";
    if (nextConfirmed && !prevConfirmed) byFp.set(fp, obs);
    else if (nextConfirmed === prevConfirmed && nextScore > prevScore) byFp.set(fp, obs);
  }
  return [...byFp.values()];
}

async function discoverAzureConnector(conn) {
  const tenantId = conn.config.tenantId;
  const clientId = conn.config.clientId;
  const subscriptionId = conn.config.subscriptionId;
  const clientSecret = conn.secrets.clientSecret;

  if (!tenantId || !clientId || !clientSecret || !subscriptionId) {
    throw new Error("Azure connector missing tenantId, clientId, clientSecret, or subscriptionId");
  }

  console.log(`[Azure Scan] Starting discovery for tenant: ${tenantId}`);

  const creds = { tenantId, clientId, clientSecret };
  const token = await getAzureAccessToken(creds);
  console.log(`[Azure Scan] Auth successful. Got management token.`);
  
  const dataToken =
    (await getOptionalToken(creds, AI_DATA_SCOPE)) ||
    (await getOptionalToken(creds, COGNITIVE_SCOPE)) ||
    token;

  console.log(`[Azure Scan] Fetching resources for subscription: ${subscriptionId}`);
  const resources = await listSubscriptionResources(token, subscriptionId);
  const discoveryErrors = [];
  const stats = emptyStats();
  stats.totalResourcesScanned = resources.length;
  console.log(`[Azure Scan] Found ${resources.length} resources in subscription.`);

  const classified = resources.map((r) => ({ resource: r, classification: classifyAzureResource(r) }));
  const aiResources = classified.filter((c) => c.classification.aiRelevant);
  const otherResources = classified.filter((c) => !c.classification.aiRelevant);
  stats.aiRelevantResources = aiResources.length;
  stats.nonAiResourcesSkipped = 0; // We evaluate all for deep scanning
  console.log(`[Azure Scan] Found ${aiResources.length} explicitly AI-relevant resources.`);

  let selected = [...classified].slice(0, MAX_RESOURCES);

  const observations = [];

  for (const { resource, classification } of selected) {
    const type = String(resource.type || "");
    const category = classification.category;

    try {
      if (type === "Microsoft.BotService/botServices" || category === "azure_bot_service") {
        observations.push(botServiceObservation(resource, conn, classification));
        continue;
      }

      if (
        AZURE_DISCOVERY_AGENT_SCAN &&
        (type === "Microsoft.CognitiveServices/accounts" ||
          type.startsWith("Microsoft.CognitiveServices/accounts/") ||
          category === "azure_openai" ||
          category === "azure_ai_foundry" ||
          category === "azure_ai_services")
      ) {
        observations.push(
          resourceToObservation(resource, conn, classification, {
            discoveryLayer: "ai_resource",
            evidence: [
              ...(classification.evidence || []),
              "AI resource confirmed; agent presence requires Agents/Assistants API evidence"
            ],
            agentRuntime: buildAgentAndRuntime({ agentDetected: false })
          })
        );

        const findings = await discoverCognitiveAgents({
          armToken: token,
          dataToken,
          resource,
          classification,
          discoveryErrors
        });
        for (const finding of findings) {
          observations.push(agentObservationFromFinding(finding, resource, conn, classification));
        }
        continue;
      }

      if (
        category === "azure_machine_learning" ||
        category === "azure_ai_search" ||
        classification.layer === "ai_resource"
      ) {
        observations.push(
          resourceToObservation(resource, conn, classification, {
            discoveryLayer: "ai_resource",
            evidence: [
              ...(classification.evidence || []),
              "AI platform resource — not automatically an agent"
            ],
            agentRuntime: buildAgentAndRuntime({ agentDetected: false })
          })
        );
        continue;
      }

      if (!AZURE_DISCOVERY_RUNTIME_SCAN) {
        observations.push(resourceToObservation(resource, conn, classification));
        continue;
      }

      if (category === "azure_container_app" || type === "Microsoft.App/containerApps") {
        const more = await discoverContainerAppRuntime(
          token,
          resource,
          conn,
          classification,
          discoveryErrors
        );
        observations.push(...more);
        continue;
      }

      if (category === "azure_aks" || type === "Microsoft.ContainerService/managedClusters") {
        const more = await discoverAksRuntime(token, resource, conn, classification, discoveryErrors);
        observations.push(...more);
        continue;
      }

      if (
        category === "azure_function" ||
        category === "azure_app_service" ||
        type === "Microsoft.Web/sites" ||
        type.startsWith("Microsoft.Web/sites/")
      ) {
        const more = await discoverWebAppRuntime(
          token,
          resource,
          conn,
          classification,
          discoveryErrors
        );
        observations.push(...more);
        continue;
      }

      if (category === "azure_vm" || type === "Microsoft.Compute/virtualMachines") {
        const more = await discoverVmRuntime(token, resource, conn, classification, discoveryErrors);
        observations.push(...more);
        continue;
      }

      if (shouldIngestAiOnly(classification.aiRelevant) || !EFFECTIVE_AZURE_AI_ONLY) {
        observations.push(
          resourceToObservation(resource, conn, classification, {
            agentRuntime: buildAgentAndRuntime({ agentDetected: false })
          })
        );
      }
    } catch (err) {
      discoveryErrors.push({
        resourceId: resource.id,
        discoveryType: "resource-scan",
        discoveryStatus: err.permissionDenied ? "permission_denied" : "error",
        error: sanitizeAzureError(err)
      });
      try {
        observations.push(
          resourceToObservation(resource, conn, classification, {
            discoveryStatus: err.permissionDenied ? "permission_denied" : "error",
            evidence: [
              ...(classification.evidence || []),
              `Deep discovery failed: ${sanitizeAzureError(err)}`
            ]
          })
        );
      } catch {
        /* ignore secondary failure */
      }
    }
  }

  let deduped = dedupeObservations(observations);
  if (EFFECTIVE_AZURE_AI_ONLY) {
    deduped = deduped.filter(obs => obs.agent?.detected || shouldIngestAiOnly(obs.metadata?.aiRelevant));
  }
  
  for (const obs of deduped) tallyObservation(stats, obs);
  stats.discoveryErrors = discoveryErrors.length;
  console.log(`[Azure Scan] Discovery complete. Found ${deduped.length} unique observations.`);

  return {
    observations: deduped,
    stats,
    discoveryErrors
  };
}

module.exports = {
  discoverAzureConnector,
  EFFECTIVE_AZURE_AI_ONLY,
  isAiRelevant,
  classifyAzureResource,
  isAzureAiResource
};
