/**
 * Application policy, not a Meta lookup. This list must be reconciled with
 * Meta's Graph API changelog before deployment; the application never guesses
 * whether a version is still supported.
 */
export const META_GRAPH_API_SUPPORTED_VERSIONS = [
  "v21.0",
  "v22.0",
  "v23.0",
] as const;

export type MetaGraphApiVersion =
  (typeof META_GRAPH_API_SUPPORTED_VERSIONS)[number];

export const META_WHATSAPP_DEFAULT_GRAPH_API_VERSION: MetaGraphApiVersion =
  "v23.0";

export interface MetaWhatsAppRuntimeConfig {
  accessToken: string | null;
  phoneNumberId: string | null;
  wabaId: string | null;
  graphApiVersion: MetaGraphApiVersion;
}

export interface MetaWhatsAppConfigurationDiagnostics {
  configured: boolean;
  wabaIdConfigured: boolean;
  graphApiVersion: MetaGraphApiVersion;
}

function readGraphApiVersion(value: string | undefined): MetaGraphApiVersion {
  const version = value?.trim() || META_WHATSAPP_DEFAULT_GRAPH_API_VERSION;
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error(
      "META_GRAPH_API_VERSION must use the Meta Graph API format vNN.N",
    );
  }
  if (
    !(META_GRAPH_API_SUPPORTED_VERSIONS as readonly string[]).includes(version)
  ) {
    throw new Error(
      `META_GRAPH_API_VERSION must be one of ${META_GRAPH_API_SUPPORTED_VERSIONS.join(
        ", ",
      )}`,
    );
  }
  return version as MetaGraphApiVersion;
}

function readOptionalSecret(value: string | undefined): string | null {
  return value?.trim() || null;
}

function readNumericIdentifier(
  value: string | undefined,
  name: string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${name} must be a numeric identifier`);
  }
  return trimmed;
}

export function readMetaWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): MetaWhatsAppRuntimeConfig {
  return {
    accessToken: readOptionalSecret(env.META_WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: readNumericIdentifier(
      env.META_WHATSAPP_PHONE_NUMBER_ID,
      "META_WHATSAPP_PHONE_NUMBER_ID",
    ),
    wabaId: readNumericIdentifier(
      env.META_WHATSAPP_WABA_ID,
      "META_WHATSAPP_WABA_ID",
    ),
    graphApiVersion: readGraphApiVersion(env.META_GRAPH_API_VERSION),
  };
}

export function getMetaWhatsAppConfigurationDiagnostics(
  env: NodeJS.ProcessEnv = process.env,
): MetaWhatsAppConfigurationDiagnostics {
  const config = readMetaWhatsAppConfig(env);
  return {
    configured: Boolean(config.accessToken && config.phoneNumberId),
    wabaIdConfigured: Boolean(config.wabaId),
    graphApiVersion: config.graphApiVersion,
  };
}
