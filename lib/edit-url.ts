// The content pipeline injects `editUrl` frontmatter as a full GitHub blob URL.
// DocsPage's `editOnGithub` wants owner/repo/sha/path, so parse it here.
export function editOptionsFromUrl(url: string | undefined) {
  if (!url) return undefined;
  const m = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|edit)\/([^/]+)\/(.+)$/);
  if (!m) return undefined;
  return { owner: m[1], repo: m[2], sha: m[3], path: m[4] };
}
