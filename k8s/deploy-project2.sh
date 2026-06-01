#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="marketplace"
BACKEND_IMAGE="voltmarket-backend:project2"
FRONTEND_IMAGE="voltmarket-frontend:project2"
RENDERED_MANIFEST="/tmp/project2-k3s.yaml"
IMAGE_DIR="/tmp/project2-k3s-images"

if ! command -v k3s >/dev/null 2>&1; then
  echo "Installing k3s..."
  curl -sfL https://get.k3s.io | sudo INSTALL_K3S_EXEC="--write-kubeconfig-mode=644" sh -
fi

if ! command -v kubectl >/dev/null 2>&1; then
  sudo ln -sf /usr/local/bin/k3s /usr/local/bin/kubectl || true
fi

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker for local image builds..."
  sudo apt-get update
  sudo apt-get install -y docker.io
  sudo systemctl enable --now docker
fi

echo "Building backend image..."
sudo docker build -t "${BACKEND_IMAGE}" "${ROOT_DIR}/backend"

echo "Building frontend image..."
sudo docker build --build-arg VITE_BASE_PATH=/ -t "${FRONTEND_IMAGE}" "${ROOT_DIR}/frontend"

echo "Importing images into k3s containerd..."
sudo mkdir -p "${IMAGE_DIR}"
sudo docker save "${BACKEND_IMAGE}" -o "${IMAGE_DIR}/backend.tar"
sudo docker save "${FRONTEND_IMAGE}" -o "${IMAGE_DIR}/frontend.tar"
sudo k3s ctr images import "${IMAGE_DIR}/backend.tar"
sudo k3s ctr images import "${IMAGE_DIR}/frontend.tar"

echo "Rendering Kubernetes manifest..."
sed "s#__PROJECT_ROOT__#${ROOT_DIR}#g" "${ROOT_DIR}/k8s/project2.yaml" > "${RENDERED_MANIFEST}"

echo "Applying Kubernetes resources..."
kubectl apply -f "${RENDERED_MANIFEST}"

echo "Waiting for rollout..."
kubectl -n "${NAMESPACE}" rollout status deployment/postgres --timeout=180s
kubectl -n "${NAMESPACE}" rollout status deployment/redis --timeout=180s
kubectl -n "${NAMESPACE}" rollout status deployment/minio --timeout=180s
kubectl -n "${NAMESPACE}" rollout status deployment/backend --timeout=300s
kubectl -n "${NAMESPACE}" rollout status deployment/frontend --timeout=180s
kubectl -n "${NAMESPACE}" rollout status deployment/adminer --timeout=180s

cat <<'INFO'

Deployment is ready.

Open from the host machine through VirtualBox/NAT forwarded ports:
  Site:          http://127.0.0.1:31080
  Adminer:       http://127.0.0.1:31082
  MinIO console: http://127.0.0.1:31091
  MinIO API:     http://127.0.0.1:31090

Kubernetes NodePorts inside the Ubuntu VM:
  frontend: 30080
  adminer:  30082
  minio api: 30090
  minio ui:  30091

Demo accounts:
  admin / admin123
  user can be registered from the site

Adminer connection:
  System:   PostgreSQL
  Server:   postgres
  Username: user
  Password: password
  Database: marketplace

INFO
