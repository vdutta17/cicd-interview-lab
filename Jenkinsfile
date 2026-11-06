pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Verify checkout') {
            steps {
                sh '''
                    echo "Repository files:"
                    ls -la
                    echo "Commit:"
                    git rev-parse HEAD
                '''
            }
        }

        stage('Verify environment') {
            steps {
                sh '''
                    whoami
                    java -version
                    git --version
                '''
            }
        }

        stage('Test application') {
            steps {
                sh '''
                    node-22 --check server.js
                    node-22 --test
                '''
            }
        }

        stage('Build Docker image') {
            when {
                beforeAgent true
                branch 'main'
            }
            agent { label 'docker' }
            options {
                skipDefaultCheckout()
            }
            steps {
                checkout scm
                sh '''
                    set -eu
                    commit=$(git rev-parse HEAD)
                    image="cicd-interview-lab:${commit}"
        
                    docker build \
                        --label "org.opencontainers.image.revision=${commit}" \
                        -t "$image" .
        
                    docker image inspect --format '{{.Id}}' "$image"
                    echo "Built $image"

                    container=$(docker run -d "$image")
                    trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
                    
                    for attempt in $(seq 1 15); do
                        if docker exec "$container" node -e '
                            fetch("http://127.0.0.1:3000/health", {
                                signal: AbortSignal.timeout(1000)
                            })
                              .then(response => {
                                  if (response.status !== 200) process.exit(1);
                              })
                              .catch(() => process.exit(1));
                        '; then
                            echo "Smoke test passed: /health returned HTTP 200"
                            exit 0
                        fi
                        sleep 1
                    done
                    
                    echo "Smoke test failed: /health did not return HTTP 200"
                    docker logs "$container"
                    exit 1
                '''
                sh '''
                    set -eu
                    set +x
                
                    region=us-east-2
                    account=$(aws sts get-caller-identity --query Account --output text)
                    registry="${account}.dkr.ecr.${region}.amazonaws.com"
                    commit=$(git rev-parse HEAD)
                    image="cicd-interview-lab:${commit}"
                    remote_image="${registry}/${image}"
                
                    DOCKER_CONFIG=$(mktemp -d)
                    export DOCKER_CONFIG
                    trap 'rm -rf "$DOCKER_CONFIG"' EXIT
                
                    password=$(aws ecr get-login-password --region "$region")
                    printf '%s' "$password" | docker login --username AWS --password-stdin "$registry"
                    unset password
                
                    docker tag "$image" "$remote_image"
                    docker push "$remote_image"
                '''
                sh(label: 'Deploy to ECS DEV', script: '''
                    set -eu
                    export AWS_DEFAULT_REGION=us-east-2
                    export AWS_PAGER=""
                
                    cluster=cicd-interview-lab
                    service=cicd-interview-lab-dev
                    repository=cicd-interview-lab
                    registry=297208880406.dkr.ecr.us-east-2.amazonaws.com
                    commit=$(git rev-parse HEAD)
                
                    digest=$(aws ecr batch-get-image \
                        --repository-name "$repository" \
                        --image-ids "imageTag=$commit" \
                        --query 'images[0].imageId.imageDigest' --output text)
                    case "$digest" in
                        sha256:*) ;;
                        *) echo "ECR image digest not found for $commit" >&2; exit 1 ;;
                    esac
                    image="$registry/$repository@$digest"
                
                    service_json=$(aws ecs describe-services \
                        --cluster "$cluster" --services "$service")
                    current=$(printf '%s' "$service_json" |
                        jq -er '.services[0] | select(.desiredCount > 0) | .taskDefinition')
                
                    task_file=$(mktemp)
                    trap 'rm -f "$task_file"' EXIT
                
                    definition=$(aws ecs describe-task-definition --task-definition "$current")
                    printf '%s' "$definition" | jq -e --arg image "$image" '
                        .taskDefinition
                        | select(any(.containerDefinitions[]; .name == "app"))
                        | del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
                              .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
                        | (.containerDefinitions[] | select(.name == "app") | .image) = $image
                    ' > "$task_file"
                
                    revision=$(aws ecs register-task-definition \
                        --cli-input-json "file://$task_file" \
                        --query 'taskDefinition.taskDefinitionArn' --output text)
                
                    echo "Previous revision: $current"
                    echo "Deploying $image with $revision"
                
                    aws ecs update-service --cluster "$cluster" --service "$service" \
                        --task-definition "$revision" >/dev/null
                    aws ecs wait services-stable --cluster "$cluster" --services "$service"
                
                    active=$(aws ecs describe-services --cluster "$cluster" --services "$service" \
                        --query 'services[0].taskDefinition' --output text)
                    if [ "$active" != "$revision" ]; then
                        echo "Expected $revision but ECS is running $active" >&2
                        exit 1
                    fi
                    echo "DEV is stable on $revision"
                ''')
            }
        }
    }
}
