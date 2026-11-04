# CI/CD interview lab

One API, deployed through Jenkins and GitHub Actions to AWS ECR and ECS Fargate.

## Stage 1: run and verify locally

```sh
npm run check
npm test
npm start
# In another terminal:
curl http://localhost:3000/health
```

Container workflow:

```sh
docker build -t cicd-interview-lab:local .
docker run --rm -p 3000:3000 --name cicd-interview-lab cicd-interview-lab:local
# In another terminal:
curl http://localhost:3000/health
```

Stop the local Node server before starting the container on the same port.

The API listens on all interfaces so container traffic can reach it. It runs as
an unprivileged user, exposes a health endpoint, and handles termination signals
so deployments can drain requests. APP_VERSION will identify the deployed commit.
There are no third-party application dependencies.

## Next stages

1. AWS region: `us-west-1`. Repository: `vdutta17/cicd-interview-lab`.
2. Provision ECR, ECS Fargate, networking, load balancer, CloudWatch, and IAM with Terraform.
3. Add GitHub Actions: checks on pull requests; build, push, deploy on main.
4. Add the equivalent Jenkins pipeline and configure its execution agent.
5. Exercise failed tests, deployment failures, rollback, and approval gates.

Use GitHub OIDC and an IAM role for Jenkins when hosted on AWS. Do not commit AWS
credentials. AWS CLI and Terraform are needed for the infrastructure stage.
