#!/bin/bash

# Humanoid Training Platform - Deployment Script
# Supports multiple deployment targets: AWS, GCP, Azure, Local

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default values
DEPLOYMENT_TARGET="local"
ENVIRONMENT="production"
PROJECT_NAME="humanoid-training-platform"
DOCKER_TAG="latest"
AWS_REGION="us-east-1"
SKIP_BUILD=false
SKIP_TESTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            DEPLOYMENT_TARGET="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --tag)
            DOCKER_TAG="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --target TARGET     Deployment target (local, aws, gcp, azure)"
            echo "  --environment ENV   Environment (development, staging, production)"
            echo "  --tag TAG          Docker image tag (default: latest)"
            echo "  --region REGION    AWS region (default: us-east-1)"
            echo "  --skip-build       Skip Docker build step"
            echo "  --skip-tests       Skip running tests"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --target local                           # Local deployment"
            echo "  $0 --target aws --environment production    # AWS production"
            echo "  $0 --target aws --tag v1.2.3              # AWS with specific tag"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "🚀 Starting deployment of Humanoid Training Platform"
print_status "Target: $DEPLOYMENT_TARGET"
print_status "Environment: $ENVIRONMENT"
print_status "Docker Tag: $DOCKER_TAG"

# Validate deployment target
case $DEPLOYMENT_TARGET in
    local|aws|gcp|azure)
        ;;
    *)
        print_error "Invalid deployment target: $DEPLOYMENT_TARGET"
        print_error "Valid targets: local, aws, gcp, azure"
        exit 1
        ;;
esac

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is required but not installed"
        exit 1
    fi
    
    # Check Docker Compose for local deployment
    if [[ "$DEPLOYMENT_TARGET" == "local" ]] && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is required for local deployment"
        exit 1
    fi
    
    # Check AWS CLI for AWS deployment
    if [[ "$DEPLOYMENT_TARGET" == "aws" ]] && ! command -v aws &> /dev/null; then
        print_error "AWS CLI is required for AWS deployment"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "Dockerfile" ]] || [[ ! -f "docker-compose.yml" ]]; then
        print_error "Please run this script from the backend directory"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        print_warning "Skipping tests as requested"
        return
    fi
    
    print_status "Running tests..."
    
    # Create test database if needed
    if [[ "$DEPLOYMENT_TARGET" == "local" ]]; then
        docker-compose -f docker-compose.test.yml up -d db redis
        sleep 10
    fi
    
    # Run tests in Docker container
    docker build -t ${PROJECT_NAME}-test --target test . || {
        print_error "Test build failed"
        exit 1
    }
    
    docker run --rm \
        --network host \
        -e DATABASE_URL="postgresql://postgres:password@localhost:5432/test_db" \
        -e REDIS_URL="redis://localhost:6379/1" \
        ${PROJECT_NAME}-test || {
        print_error "Tests failed"
        exit 1
    }
    
    print_success "All tests passed"
}

# Build Docker image
build_image() {
    if [[ "$SKIP_BUILD" == true ]]; then
        print_warning "Skipping build as requested"
        return
    fi
    
    print_status "Building Docker image..."
    
    # Build the image
    docker build \
        --tag ${PROJECT_NAME}:${DOCKER_TAG} \
        --tag ${PROJECT_NAME}:latest \
        --build-arg ENVIRONMENT=${ENVIRONMENT} \
        . || {
        print_error "Docker build failed"
        exit 1
    }
    
    print_success "Docker image built successfully"
}

# Deploy locally using Docker Compose
deploy_local() {
    print_status "Deploying locally with Docker Compose..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        print_status "Creating .env file..."
        cat > .env << EOF
POSTGRES_PASSWORD=humanoid_secure_pass
REDIS_PASSWORD=redis_secure_pass
SECRET_KEY=super_secret_key_change_in_production
ENVIRONMENT=${ENVIRONMENT}
EOF
        print_warning "Created .env file with default values. Please update passwords for production!"
    fi
    
    # Stop existing containers
    docker-compose down --remove-orphans || true
    
    # Start services
    docker-compose up -d --build
    
    # Wait for services to be healthy
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "✅ Backend is healthy"
    else
        print_error "❌ Backend health check failed"
        docker-compose logs backend
        exit 1
    fi
    
    print_success "🎉 Local deployment completed successfully!"
    print_status "Backend API: http://localhost:8000"
    print_status "API Docs: http://localhost:8000/docs"
    print_status "Database: localhost:5432"
    print_status "Redis: localhost:6379"
}

# Deploy to AWS
deploy_aws() {
    print_status "Deploying to AWS..."
    
    # Check AWS authentication
    aws sts get-caller-identity > /dev/null || {
        print_error "AWS authentication failed. Please run 'aws configure' or set up credentials"
        exit 1
    }
    
    # Set AWS account ID and region
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    ECR_REPOSITORY="${ECR_REGISTRY}/${PROJECT_NAME}"
    
    print_status "AWS Account: $AWS_ACCOUNT_ID"
    print_status "ECR Repository: $ECR_REPOSITORY"
    
    # Login to ECR
    print_status "Logging in to ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${ECR_REGISTRY}
    
    # Create ECR repository if it doesn't exist
    aws ecr describe-repositories --repository-names ${PROJECT_NAME} --region ${AWS_REGION} > /dev/null 2>&1 || {
        print_status "Creating ECR repository..."
        aws ecr create-repository \
            --repository-name ${PROJECT_NAME} \
            --region ${AWS_REGION} \
            --image-scanning-configuration scanOnPush=true
    }
    
    # Tag and push image to ECR
    print_status "Pushing image to ECR..."
    docker tag ${PROJECT_NAME}:${DOCKER_TAG} ${ECR_REPOSITORY}:${DOCKER_TAG}
    docker tag ${PROJECT_NAME}:${DOCKER_TAG} ${ECR_REPOSITORY}:latest
    docker push ${ECR_REPOSITORY}:${DOCKER_TAG}
    docker push ${ECR_REPOSITORY}:latest
    
    # Deploy CloudFormation stack
    print_status "Deploying CloudFormation stack..."
    STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
    
    aws cloudformation deploy \
        --template-file deploy/aws/cloudformation.yml \
        --stack-name ${STACK_NAME} \
        --parameter-overrides \
            ProjectName=${PROJECT_NAME} \
            Environment=${ENVIRONMENT} \
            DatabasePassword=${DATABASE_PASSWORD:-$(openssl rand -base64 32)} \
        --capabilities CAPABILITY_IAM \
        --region ${AWS_REGION} || {
        print_error "CloudFormation deployment failed"
        exit 1
    }
    
    # Get ALB URL
    ALB_URL=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${AWS_REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
        --output text)
    
    # Wait for service to be ready
    print_status "Waiting for service to be ready..."
    for i in {1..30}; do
        if curl -f ${ALB_URL}/health > /dev/null 2>&1; then
            break
        fi
        sleep 10
    done
    
    # Verify deployment
    if curl -f ${ALB_URL}/health > /dev/null 2>&1; then
        print_success "✅ AWS deployment successful!"
        print_status "API URL: ${ALB_URL}"
        print_status "API Docs: ${ALB_URL}/docs"
    else
        print_error "❌ AWS deployment health check failed"
        exit 1
    fi
}

# Deploy to GCP (placeholder)
deploy_gcp() {
    print_status "GCP deployment coming soon..."
    print_warning "GCP deployment is not yet implemented"
    exit 1
}

# Deploy to Azure (placeholder)
deploy_azure() {
    print_status "Azure deployment coming soon..."
    print_warning "Azure deployment is not yet implemented"
    exit 1
}

# Generate deployment summary
generate_summary() {
    print_success "🎉 Deployment Summary"
    echo "======================================"
    echo "Project: $PROJECT_NAME"
    echo "Environment: $ENVIRONMENT"
    echo "Target: $DEPLOYMENT_TARGET"
    echo "Tag: $DOCKER_TAG"
    echo "Timestamp: $(date)"
    echo "======================================"
    
    case $DEPLOYMENT_TARGET in
        local)
            echo "🔗 Local Services:"
            echo "  - Backend API: http://localhost:8000"
            echo "  - API Documentation: http://localhost:8000/docs"
            echo "  - Database: localhost:5432"
            echo "  - Redis: localhost:6379"
            ;;
        aws)
            echo "☁️ AWS Services:"
            echo "  - API URL: $ALB_URL"
            echo "  - Region: $AWS_REGION"
            echo "  - ECR Repository: $ECR_REPOSITORY"
            ;;
    esac
    
    echo ""
    print_status "🚀 Humanoid Training Platform deployed successfully!"
}

# Main deployment flow
main() {
    check_prerequisites
    
    # Skip tests and build for certain scenarios
    if [[ "$DEPLOYMENT_TARGET" != "local" ]] || [[ "$SKIP_TESTS" != true ]]; then
        run_tests
    fi
    
    build_image
    
    case $DEPLOYMENT_TARGET in
        local)
            deploy_local
            ;;
        aws)
            deploy_aws
            ;;
        gcp)
            deploy_gcp
            ;;
        azure)
            deploy_azure
            ;;
    esac
    
    generate_summary
}

# Run main function
main "$@"