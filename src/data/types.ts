/** The loader preserves YAML contents; domain-specific validation is a separate concern. */
export interface LoadedDocument {
  readonly path: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface LoadedKit {
  readonly documents: readonly LoadedDocument[];
  /** Present only for verified runtime kits; raw parser fixtures intentionally omit it. */
  readonly verifiedAsset?: (path: string) => string;
}
