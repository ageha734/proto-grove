import { parse as parseToml } from "@std/toml";

export interface Config {
  general: {
    createDashboard: boolean;
    commitMessagePrefix: string;
    prTitlePrefix: string;
  };
  automerge: {
    patch: boolean;
    minor: boolean;
    major: boolean;
    securityFix: boolean;
  };
  labels: {
    base: string[];
    automerge: string;
    security: string;
    major: string;
  };
  repos: Record<string, string>;
  ignore: {
    tools: string[];
    patterns: string[];
  };
  resolve: {
    tagStripPrefixes: string[];
    respectMajorMinorPin: boolean;
  };
  rateLimit: {
    delayMs: number;
    maxConcurrent: number;
  };
  security: {
    enabled: boolean;
    createIssue: boolean;
    ecosystems: string[];
  };
}

export function defaultConfig(): Config {
  return {
    general: {
      createDashboard: true,
      commitMessagePrefix: "chore(deps):",
      prTitlePrefix: "chore(deps):",
    },
    automerge: {
      patch: true,
      minor: true,
      major: false,
      securityFix: true,
    },
    labels: {
      base: ["dependencies"],
      automerge: "automerge",
      security: "security",
      major: "major-update",
    },
    repos: {},
    ignore: {
      tools: [],
      patterns: [],
    },
    resolve: {
      tagStripPrefixes: ["^v", "^kustomize/"],
      respectMajorMinorPin: true,
    },
    rateLimit: {
      delayMs: 1000,
      maxConcurrent: 5,
    },
    security: {
      enabled: true,
      createIssue: true,
      ecosystems: ["Go", "PyPI", "npm", "crates.io", "RubyGems"],
    },
  };
}

export function loadConfig(content: string): Config {
  const base = defaultConfig();
  const parsed = parseToml(content) as Record<string, unknown>;

  const general = parsed["general"] as Record<string, unknown> | undefined;
  if (general) {
    if (typeof general["create-dashboard"] === "boolean") {
      base.general.createDashboard = general["create-dashboard"];
    }
    if (typeof general["commit-message-prefix"] === "string") {
      base.general.commitMessagePrefix = general["commit-message-prefix"];
    }
    if (typeof general["pr-title-prefix"] === "string") {
      base.general.prTitlePrefix = general["pr-title-prefix"];
    }
  }

  const automerge = parsed["automerge"] as Record<string, unknown> | undefined;
  if (automerge) {
    if (typeof automerge["patch"] === "boolean") {
      base.automerge.patch = automerge["patch"];
    }
    if (typeof automerge["minor"] === "boolean") {
      base.automerge.minor = automerge["minor"];
    }
    if (typeof automerge["major"] === "boolean") {
      base.automerge.major = automerge["major"];
    }
    if (typeof automerge["security-fix"] === "boolean") {
      base.automerge.securityFix = automerge["security-fix"];
    }
  }

  const labels = parsed["labels"] as Record<string, unknown> | undefined;
  if (labels) {
    if (Array.isArray(labels["base"])) {
      base.labels.base = labels["base"] as string[];
    }
    if (typeof labels["automerge"] === "string") {
      base.labels.automerge = labels["automerge"];
    }
    if (typeof labels["security"] === "string") {
      base.labels.security = labels["security"];
    }
    if (typeof labels["major"] === "string") {
      base.labels.major = labels["major"];
    }
  }

  const repos = parsed["repos"] as Record<string, string> | undefined;
  if (repos) {
    base.repos = { ...repos };
  }

  const ignore = parsed["ignore"] as Record<string, unknown> | undefined;
  if (ignore) {
    if (Array.isArray(ignore["tools"])) {
      base.ignore.tools = ignore["tools"] as string[];
    }
    if (Array.isArray(ignore["patterns"])) {
      base.ignore.patterns = ignore["patterns"] as string[];
    }
  }

  const resolve = parsed["resolve"] as Record<string, unknown> | undefined;
  if (resolve) {
    if (Array.isArray(resolve["tag-strip-prefixes"])) {
      base.resolve.tagStripPrefixes = resolve["tag-strip-prefixes"] as string[];
    }
    if (typeof resolve["respect-major-minor-pin"] === "boolean") {
      base.resolve.respectMajorMinorPin = resolve["respect-major-minor-pin"];
    }
  }

  const security = parsed["security"] as Record<string, unknown> | undefined;
  if (security) {
    if (typeof security["enabled"] === "boolean") {
      base.security.enabled = security["enabled"];
    }
    if (typeof security["create-issue"] === "boolean") {
      base.security.createIssue = security["create-issue"];
    }
    if (Array.isArray(security["ecosystems"])) {
      base.security.ecosystems = security["ecosystems"] as string[];
    }
  }

  return base;
}
