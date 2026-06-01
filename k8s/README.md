# Project2 k3s deployment

This deploys the full project to a single-node k3s VM:

- React frontend
- Django backend
- PostgreSQL
- Redis
- MinIO
- Adminer

## VM NAT ports

Configure the VM port forwarding like this:

| Name | Protocol | Host IP | Host Port | Guest Port |
| --- | --- | --- | --- | --- |
| project2-ssh | TCP | 127.0.0.1 | 2223 | 22 |
| project2-site | TCP | 127.0.0.1 | 31080 | 30080 |
| project2-adminer | TCP | 127.0.0.1 | 31082 | 30082 |
| project2-minio | TCP | 127.0.0.1 | 31091 | 30091 |
| project2-media | TCP | 127.0.0.1 | 31090 | 30090 |

## Deploy

On the empty Ubuntu VM:

```bash
sudo apt-get update
sudo apt-get install -y git curl
git clone https://github.com/teoxxid/zalalal.git
cd zalalal
chmod +x k8s/deploy-project2.sh
./k8s/deploy-project2.sh
```

The script installs k3s and Docker if missing, builds local backend/frontend images, imports them into k3s containerd, applies Kubernetes resources, runs migrations, seeds PostgreSQL and uploads media files to MinIO.

## URLs from the host machine

```text
Site:          http://127.0.0.1:31080
Adminer:       http://127.0.0.1:31082
MinIO console: http://127.0.0.1:31091
MinIO API:     http://127.0.0.1:31090
```

## Credentials

Site admin:

```text
admin / admin123
```

MinIO:

```text
minioadmin / minioadmin
```

Adminer:

```text
System: PostgreSQL
Server: postgres
Username: user
Password: password
Database: marketplace
```

## Useful commands

```bash
kubectl -n marketplace get pods
kubectl -n marketplace get svc
kubectl -n marketplace logs deployment/backend
kubectl -n marketplace rollout restart deployment/backend deployment/frontend
```
