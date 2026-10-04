Versioning starts at 1.0.0 under the `@xano-sdk/onboard` name. only increment 1.0.x for now regardless of change - we want to move quick. Don't bump unless told specifically

Before release:
- README is up to date
- Tests pass (`npm test`, `npm run typecheck`, `npm run lint`)
- Bump package.json version
- No information about xano source code is revealed inc function names, repo names, etc

Release Description
- Start from .github/RELEASE_TEMPLATE.md - it carries the shape and the Slack constraints
- No need for a story - just a brief summary. After the summary include an itemized title/short description about each change. If anything seems important put it there too
- Each change gets its own `##` heading, because the Slack announcement turns those headings into the itemized bullet list (first 8 shown)
- Include all noteworthy changes since previous release
- Publishing the GitHub release triggers .github/workflows/release-slack.yml, which announces it on Slack. Verify a draft renders with `cd .github/scripts && python3 test_slack_release_message.py`
