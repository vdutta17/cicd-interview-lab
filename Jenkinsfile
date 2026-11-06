pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 5, unit: 'MINUTES')
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
                sh(label: 'Deploy to ECS DEV', ...)
            }
        }
    }
}
