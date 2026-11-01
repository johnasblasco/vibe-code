/** The loader preserves YAML contents; domain-specific validation is a separate concern. */
export interface LoadedDocument {
  readonly path: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface LoadedKit {
  readonly documents: readonly LoadedDocument[];
}
