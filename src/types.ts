// Define types for Sentry API responses
export interface SentryTeam {
  id: string;
  name: string;
  slug: string;
}

export interface SentryProject {
  id: string;
  name: string;
  slug: string;
  platform?: string;
  teams: SentryTeam[];
  environments?: string[];
  features?: string[];
}

// Define interface for project creation response
export interface SentryProjectCreationResponse {
  id: string;
  slug: string;
  name: string;
  platform: string;
  dateCreated: string;
  isBookmarked: boolean;
  isMember: boolean;
  features: string[];
  firstEvent: string | null;
  firstTransactionEvent: boolean;
  access: string[];
  hasAccess: boolean;
  hasMinifiedStackTrace: boolean;
  hasFeedbacks: boolean;
  hasMonitors: boolean;
  hasNewFeedbacks: boolean;
  hasProfiles: boolean;
  hasReplays: boolean;
  hasFlags: boolean;
  hasSessions: boolean;
  hasInsightsHttp: boolean;
  hasInsightsDb: boolean;
  hasInsightsAssets: boolean;
  hasInsightsAppStart: boolean;
  hasInsightsScreenLoad: boolean;
  hasInsightsVitals: boolean;
  hasInsightsCaches: boolean;
  hasInsightsQueues: boolean;
  hasInsightsLlmMonitoring: boolean;
  isInternal: boolean;
  isPublic: boolean;
  avatar: {
    avatarType: string;
    avatarUuid: string | null;
  };
  color: string;
  status: string;
}

// Define interface for client key response
export interface SentryClientKey {
  id: string;
  name: string;
  label: string;
  public: string;
  secret: string;
  projectId: number;
  isActive: boolean;
  rateLimit: {
    window: number;
    count: number;
  } | null;
  dsn: {
    secret: string;
    public: string;
    csp: string;
    security: string;
    minidump: string;
    nel: string;
    unreal: string;
    cdn: string;
    crons: string;
  };
  browserSdkVersion: string;
  browserSdk: {
    choices: [string, string][];
  };
  dateCreated: string;
  dynamicSdkLoaderOptions: {
    hasReplay: boolean;
    hasPerformance: boolean;
    hasDebug: boolean;
  };
}

// Define interface for error event response
export interface SentryErrorEvent {
  eventID: string;
  tags: Array<{
    key: string;
    value: string;
  }>;
  dateCreated: string;
  user: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  } | null;
  message: string;
  title: string;
  id: string;
  platform: string;
  "event.type": string;
  groupID: string;
  crashFile: string | null;
  location: string;
  culprit: string;
  projectID: string;
  metadata: any | null;
}

// Define interface for project issue response
export interface SentryProjectIssue {
  annotations: any[];
  assignedTo: {
    type: string;
    id: string;
    name: string;
    email: string;
  } | null;
  count: string;
  culprit: string;
  firstSeen: string;
  hasSeen: boolean;
  id: string;
  isBookmarked: boolean;
  isPublic: boolean;
  isSubscribed: boolean;
  lastSeen: string;
  level: string;
  logger: string | null;
  metadata: {
    title: string;
  };
  numComments: number;
  permalink: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  shareId: string | null;
  shortId: string;
  stats: {
    "24h": [number, number][];
  };
  status: string;
  statusDetails: Record<string, any>;
  subscriptionDetails: any | null;
  title: string;
  type: string;
  userCount: number;
  isUnhandled?: boolean;
  platform?: string;
}

// Define interface for the short ID resolution response
export interface ShortIdResolutionResponse {
  group: {
    annotations: any[];
    assignedTo: any | null;
    count: string;
    culprit: string;
    firstSeen: string;
    hasSeen: boolean;
    id: string;
    isBookmarked: boolean;
    isPublic: boolean;
    isSubscribed: boolean;
    lastSeen: string;
    level: string;
    logger: string | null;
    metadata: {
      title: string;
    };
    numComments: number;
    permalink: string;
    project: {
      id: string;
      name: string;
      slug: string;
    };
    shareId: string | null;
    shortId: string;
    status: string;
    statusDetails: Record<string, any>;
    subscriptionDetails: any | null;
    title: string;
    type: string;
    userCount: number;
  };
  groupId: string;
  organizationSlug: string;
  projectSlug: string;
  shortId: string;
}

// Define interface for the event details response
export interface EventDetailsResponse {
  event: {
    _meta: {
      context: any | null;
      contexts: any | null;
      entries: Record<string, any>;
      message: any | null;
      packages: any | null;
      sdk: any | null;
      tags: Record<string, any>;
      user: any | null;
    };
    context: Record<string, any>;
    contexts: Record<string, any>;
    dateCreated: string;
    dateReceived: string;
    dist: string | null;
    entries: Array<{
      type: string;
      data: Record<string, any>;
    }>;
    errors: any[];
    eventID: string;
    fingerprints: string[];
    groupID: string;
    id: string;
    message: string;
    title: string;
    metadata: {
      title: string;
    };
    packages: Record<string, string>;
    platform: string;
    sdk: any | null;
    size: number;
    tags: Array<{
      _meta: any | null;
      key: string;
      value: string;
    }>;
    type: string;
    stacktrace?: SentryStackTrace;
    user: {
      data: Record<string, any>;
      email: string;
      id: string;
      ip_address: string;
      name: string;
      username: string;
    };
  };
  eventId: string;
  groupId: string;
  organizationSlug: string;
  projectSlug: string;
}

export interface SentryTeam {
  id: string;
  slug: string;
  name: string;
  dateCreated: string;
  isMember: boolean;
  teamRole: string;
  flags: {
    "idp:provisioned": boolean;
  };
  access: string[];
  hasAccess: boolean;
  isPending: boolean;
  memberCount: number;
  avatar: {
    avatarType: string;
    avatarUuid: string | null;
  };
  orgRole: string | null;
}

export interface SentryIssueActivity {
  data: Record<string, any>;
  dateCreated: string;
  id: string;
  type: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface SentryReleaseProject {
  name: string;
  slug: string;
}

export interface SentryRelease {
  authors: any[];
  commitCount: number;
  data: Record<string, any>;
  dateCreated: string;
  dateReleased: string | null;
  deployCount: number;
  firstEvent: string;
  lastCommit: any | null;
  lastDeploy: any | null;
  lastEvent: string;
  newGroups: number;
  owner: any | null;
  projects: SentryReleaseProject[];
  ref: string | null;
  shortVersion: string;
  url: string | null;
  version: string;
}

export interface SentryIssueDetailsResponse {
  activity: SentryIssueActivity[];
  annotations: string[];
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  count: string;
  culprit: string;
  firstRelease: SentryRelease | null;
  firstSeen: string;
  hasSeen: boolean;
  id: string;
  isBookmarked: boolean;
  isPublic: boolean;
  isSubscribed: boolean;
  lastRelease: SentryRelease | null;
  lastSeen: string;
  level: string;
  logger: string | null;
  metadata: {
    title: string;
  };
  numComments: number;
  participants: any[];
  permalink: string;
  pluginActions: any[];
  pluginContexts: any[];
  pluginIssues: any[];
  project: {
    id: string;
    name: string;
    slug: string;
  };
  seenBy: any[];
  shareId: string | null;
  shortId: string;
  stats: {
    "24h": [number, number][];
    "30d": [number, number][];
  };
  status: string;
  statusDetails: Record<string, any>;
  subscriptionDetails: any | null;
  tags: {
    key: string;
    value: string;
  }[];
  title: string;
  type: string;
  userCount: number;
  userReportCount: number;
}

export interface SentryStackTraceFrame {
  function?: string;
  errors?: any;
  colNo?: number;
  vars?: any;
  package?: string;
  absPath?: string;
  inApp?: boolean;
  lineNo?: number;
  module?: string;
  filename?: string;
  platform?: string;
  instructionAddr?: string;
  context?: [number, string][];
  symbolAddr?: string;
  trust?: string;
  symbol?: string;
}

export interface SentryStackTrace {
  frames: SentryStackTraceFrame[];
  framesOmitted?: any;
  registers?: any;
  hasSystemFrames?: boolean;
}

export interface SentryExceptionValue {
  stacktrace?: SentryStackTrace;
  module?: string;
  rawStacktrace?: SentryStackTrace;
  mechanism?: {
    type: string;
    handled: boolean;
  };
  threadId?: string;
  value: string;
  type: string;
}

export interface SentryExceptionEntry {
  type: string;
  data: {
    values: SentryExceptionValue[];
    excOmitted?: any;
    hasSystemFrames?: boolean;
  };
}

export interface SentryBreadcrumb {
  category: string;
  level: string;
  event_id?: string;
  timestamp: string;
  data?: any;
  message?: string;
  type: string;
}

export interface SentryBreadcrumbsEntry {
  type: string;
  data: {
    values: SentryBreadcrumb[];
  };
}

export interface SentryRequestEntry {
  type: string;
  data: {
    fragment?: string;
    cookies: any[];
    inferredContentType?: string;
    env?: any;
    headers: [string, string][];
    url: string;
    query: [string, string][];
    data?: any;
    method?: string;
  };
}

export interface SentryEventDetailedResponse {
  groupID: string;
  eventID: string;
  dist?: string;
  userReport?: any;
  previousEventID?: string;
  message: string;
  title: string;
  id: string;
  size: number;
  errors?: {
    data: {
      column: number;
      source: string;
      row: number;
    };
    message: string;
    type: string;
  }[];
  platform: string;
  nextEventID?: string;
  type: string;
  metadata: {
    type: string;
    value: string;
  };
  tags: {
    value: string;
    key: string;
  }[];
  dateCreated: string;
  dateReceived: string;
  user?: {
    username?: string;
    name?: string;
    ip_address?: string;
    email?: string;
    data?: Record<string, any>;
    id?: string;
  };
  entries: (
    | SentryExceptionEntry
    | SentryBreadcrumbsEntry
    | SentryRequestEntry
  )[];
  packages: Record<string, any>;
  sdk: {
    version: string;
    name: string;
  };
  _meta: {
    user: any;
    context: any;
    entries: Record<string, any>;
    contexts: any;
    message: any;
    packages: any;
    tags: Record<string, any>;
    sdk: any;
  };
  contexts: Record<string, any>;
  fingerprints: string[];
  context?: Record<string, any>;
  release?: {
    dateReleased: string;
    commitCount: number;
    url: string;
    data: Record<string, any>;
    lastDeploy?: {
      name: string;
      url?: string;
      environment: string;
      dateStarted?: string;
      dateFinished: string;
      id: string;
    };
    deployCount: number;
    dateCreated: string;
    version: string;
    lastCommit?: {
      repository: {
        status: string;
        integrationId: string;
        externalSlug: string;
        name: string;
        provider: {
          id: string;
          name: string;
        };
        url: string;
        id: string;
        dateCreated: string;
      };
      releases: {
        dateReleased: string;
        url: string;
        dateCreated: string;
        version: string;
        shortVersion: string;
        ref: string;
      }[];
      dateCreated: string;
      message: string;
      id: string;
    };
    ref: string;
  };
  crashFile?: string;
  location?: string;
  culprit?: string;
  groupingConfig?: {
    enhancements: string;
    id: string;
  };
  occurrence?: any;
  projectID: string;
  resolvedWith?: any[];
  sdkUpdates?: any[];
}

// Define interface for Sentry setup response
export interface SentrySetupResponse {
  projectId: string;
  projectName: string;
  projectSlug: string;
  dsn: string;
  clientKeys?: SentryClientKey[];
  installationInstructions: {
    [language: string]: string;
  };
}

// Define interface for Sentry replay response
export interface SentryReplay {
  activity: number;
  browser: {
    name: string;
    version: string;
  };
  count_dead_clicks: number;
  count_rage_clicks: number;
  count_errors: number;
  count_segments: number;
  count_urls: number;
  device: {
    brand: string;
    family: string;
    model: string;
    name: string;
  } | null;
  dist: string | null;
  duration: number;
  environment: string;
  error_ids: string[];
  finished_at: string;
  has_viewed: boolean;
  id: string;
  is_archived: boolean | null;
  os: {
    name: string;
    version: string;
  } | null;
  platform: string;
  project_id: string;
  releases: string[];
  sdk: {
    name: string;
    version: string;
  };
  started_at: string;
  tags: Record<string, string[]>;
  trace_ids: string[];
  urls: string[];
  user: {
    display_name: string;
    email: string;
    id: string;
    ip: string;
    username: string;
  } | null;
  // Additional fields that may be requested via the field parameter
  clicks?: any[];
  info_ids?: string[];
  warning_ids?: string[];
  count_warnings?: number;
  count_infos?: number;
}
