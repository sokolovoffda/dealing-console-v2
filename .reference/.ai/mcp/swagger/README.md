# Swagger MCP Server

Local STDIO MCP server for working with the organization Swagger/OpenAPI.

The server is stored in the project, but the real Codex MCP configuration should stay in the user-level Codex config:

```text
%USERPROFILE%\.codex\config.toml
```

Do not store API tokens in the repository. The server reads the token only from `SWAGGER_TOKEN`.

## Install

```powershell
cd C:\Users\d.sokolov\Desktop\projects\dealing-console-ui\.ai\mcp\swagger
npm install
```

## Build

```powershell
npm run typecheck
npm run build
```

## Run Manually

For a one-time PowerShell session:

```powershell
$env:SWAGGER_TOKEN = "your-token"
npm run start
```

For persistent Windows User env:

```powershell
[Environment]::SetEnvironmentVariable("SWAGGER_TOKEN", "your-token", "User")
```

Restart Codex IDE after setting the persistent env variable.

The server also supports:

```powershell
$env:SWAGGER_BASE_URL = "http://192.168.232.234:6001"
$env:SWAGGER_SPEC_URL = "http://192.168.232.234:6001/swagger/v1/swagger.json"
```

Defaults:

```text
SWAGGER_BASE_URL=http://192.168.232.234:6001
SWAGGER_SPEC_URL=http://192.168.232.234:6001/swagger/v1/swagger.json
```

`SWAGGER_TOKEN` has no default. If it is not set, the server still starts, but tools warn that protected endpoints may fail.

## Codex IDE Configuration

Open Codex IDE settings and find the MCP settings / MCP servers section. If the UI does not expose a config editor, edit the user-level file directly:

```text
%USERPROFILE%\.codex\config.toml
```

Add this block to the user-level Codex config:

```toml
[mcp_servers.org_swagger]
command = "node"
args = [".ai/mcp/swagger/dist/index.js"]
cwd = "C:\\Users\\d.sokolov\\Desktop\\projects\\dealing-console-ui"
startup_timeout_sec = 20
tool_timeout_sec = 60
enabled = true
default_tools_approval_mode = "prompt"
env_vars = ["SWAGGER_TOKEN"]

[mcp_servers.org_swagger.env]
SWAGGER_BASE_URL = "http://192.168.232.234:6001"
SWAGGER_SPEC_URL = "http://192.168.232.234:6001/swagger/v1/swagger.json"

[mcp_servers.org_swagger.tools.get_openapi_spec]
approval_mode = "approve"

[mcp_servers.org_swagger.tools.search_api]
approval_mode = "approve"

[mcp_servers.org_swagger.tools.describe_endpoint]
approval_mode = "approve"

[mcp_servers.org_swagger.tools.call_api_get]
approval_mode = "prompt"
```

## Tools

- `get_openapi_spec`: loads OpenAPI JSON and returns summary fields. Pass `full=true` to return the full spec.
- `search_api`: searches endpoints by path, method, operationId, tags, summary, and description.
- `describe_endpoint`: returns parameters, requestBody, responses, referenced DTO schemas, and security for one endpoint.
- `call_api_get`: performs only GET requests against `SWAGGER_BASE_URL + path`.

`call_api_get` rejects absolute URLs, requires `path` to start with `/`, and only allows requests to the host configured by `SWAGGER_BASE_URL`.

## Example Codex Prompt

```text
Через MCP найди endpoint создания группы контактов.
```
