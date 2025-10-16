/**
 * MSW handlers for GitHub API
 */
import { http, HttpResponse } from "msw"

export interface GitHubHandlerOptions {
  fail?: boolean
  notFound?: boolean
}

export function githubHandlers(options: GitHubHandlerOptions = {}) {
  const { fail = false, notFound = false } = options

  return [
    http.get("https://api.github.com/repos/:owner/:repo", ({ params }) => {
      if (notFound) {
        return HttpResponse.json({ message: "Not Found" }, { status: 404 })
      }

      if (fail) {
        return HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
      }

      return HttpResponse.json({
        id: 123,
        name: params.repo,
        full_name: `${params.owner}/${params.repo}`,
        owner: {
          login: params.owner,
          id: 456,
        },
        private: false,
        description: "Test repository",
        stargazers_count: 100,
        watchers_count: 50,
        forks_count: 25,
      })
    }),
  ]
}
