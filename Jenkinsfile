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
    }
}
