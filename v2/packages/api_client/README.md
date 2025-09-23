# API Client Package

Houses generated client code for AWS-backed services.

## Responsibilities
- REST client for API Gateway (FastAPI Lambda) endpoints using `dio` + `retrofit` codegen.
- GraphQL client for AppSync using `amplify_api` or `graphql_flutter` with subscriptions.
- Authentication middleware integrating Cognito (user pools + identity pools).
- Offline queue for request replay when connectivity resumes.

## Pipeline
1. Define OpenAPI specs in `/v2/infrastructure/api/openapi/` and GraphQL schemas under `/v2/infrastructure/appsync/`.
2. Use `build_runner` with `retrofit_generator` and `json_serializable` to emit clients.
3. Package distributed via melos to the Flutter app and potentially other tooling (CLI, scripts).

## Testing
- Contract tests with `aws-sam-cli` local emulation and mocked Cognito tokens.
- Integration tests hitting deployed dev stack via GitHub Actions nightly runs.
