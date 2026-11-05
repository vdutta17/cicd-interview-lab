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
                '''
            }
        }
    }
}
