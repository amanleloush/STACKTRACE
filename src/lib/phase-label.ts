// Acronym-aware phase-slug formatter. Used by every place that turns a
// content-collection phase slug ("09-dp", "04-bfs", …) into a human label.
//
// Default behaviour is title-case per word; words listed in ACRONYMS render
// fully upper-case ("DP", "BFS", "HLD") so engineering shorthand reads right.

const ACRONYMS = new Set([
  'DP', 'BFS', 'DFS', 'LRU', 'LCS', 'LIS', 'SCC', 'MST', 'TSP', 'XOR',
  'DSA', 'HLD', 'LLD',
  'API', 'APIS', 'CDN', 'DNS', 'HTTP', 'HTTPS', 'TCP', 'UDP', 'TLS', 'MTLS',
  'OS', 'BFF', 'DDD', 'PII', 'SLOS', 'SLO', 'OWASP', 'CRUD',
  'SQL', 'NOSQL', 'JSON', 'XML', 'REST', 'GRPC', 'WS', 'SSE', 'JWT', 'SSO',
  'CI', 'CD', 'OAUTH',
]);

export function formatPhaseLabel(slug: string): string {
  return slug
    .replace(/^[0-9]+-/, '')
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => {
      if (!w) return w;
      const upper = w.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}
