# Infrastructure Overview

## Tooling
- AWS CDK (Python) targeting multiple environments (dev, staging, prod)
- Terraform modules for shared networking and IAM baselines where CDK is insufficient
- GitHub Actions workflows invoking CDK bootstrap/deploy via OIDC

## Core Stacks
1. **Networking Stack** – VPC with private subnets, NAT, VPC endpoints for S3/DynamoDB, security groups.
2. **Auth Stack** – Cognito user pool, identity pool, hosted UI, Lambda triggers for custom flows.
3. **API Stack** – API Gateway HTTP APIs, Lambda functions (FastAPI via Mangum), DynamoDB tables, Step Functions, EventBridge buses.
4. **Media Stack** – S3 buckets with intelligent tiering, S3 presigned upload workflow, MediaConvert jobs, CloudFront CDN.
5. **Realtime Stack** – AppSync GraphQL API, DynamoDB resolvers, WebSocket integration.
6. **Observability Stack** – CloudWatch dashboards, X-Ray tracing, AWS Health metrics, centralized logging (OpenSearch).

## Deployment Strategy
- Feature branches deploy ephemeral preview stacks using unique stage names.
- `main` merges trigger staged deployments: dev → staging → production via manual approval.
- Secrets managed in AWS Secrets Manager and referenced via parameter store in CI.

## Next Actions
1. Draft CDK app skeleton with placeholder stacks.
2. Document IAM least privilege policies for CI roles.
3. Set up local testing via `sam local` and `localstack` for high-fidelity emulation.
