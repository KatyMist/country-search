export function createSearchController(options: unknown): {
  setQuery: (query: string) => void;
  retry: () => void;
} {
  void options;
  return { setQuery: () => {}, retry: () => {} };
}
