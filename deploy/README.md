# Self-hosting Redactly

Redactly ships as a single static nginx container for the app (intended for
`app.example.com`). It runs fully non-root in Kubernetes, with strict
NetworkPolicy egress (DNS only).

This directory contains **generic templates**. Replace the placeholder
hostname (`app.example.com`) with your own domain, update the cert-manager
`ClusterIssuer` annotation if needed, and apply.

## Two deployment paths

| Path           | Use when                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| Docker Compose | Single-host quick start, local testing, low-traffic self-hosting           |
| Kubernetes     | Production, HA, GitOps-friendly (works with ArgoCD, Flux, plain `kubectl`) |

---

## Docker Compose

```bash
docker compose -f deploy/docker-compose.yml up -d
```

The container listens on `127.0.0.1:8080`. Put your own reverse proxy
(Caddy / Traefik / nginx / Cloudflare Tunnel) in front to terminate TLS
and route your hostname.

---

## Kubernetes

### Prerequisites

| Component             | Notes                                                           |
| --------------------- | --------------------------------------------------------------- |
| **ingress-nginx**     | `ingressClassName: nginx` is hard-coded in the Ingress manifest |
| **cert-manager**      | Used to issue TLS via a `ClusterIssuer`                         |
| **A `ClusterIssuer`** | Manifest defaults to `letsencrypt-prod` — adjust the annotation |

### Quick start

```bash
# 1. Apply the namespace first
kubectl apply -f deploy/k8s/namespace.yaml

# 2. Replace the placeholder hostname in the Ingress
#    (deploy/k8s/app/ingress.yaml) — change app.example.com to your domain.

# 3. Apply everything recursively
kubectl apply -R -f deploy/k8s/
```

cert-manager issues a certificate once the Ingress is created and DNS resolves.

### Image references

The deployment manifests pull from the public GitHub Container Registry:

```
ghcr.io/moritz-hauff-it/redactly-app:latest
```

The image is built and pushed by the CI workflow
(`.github/workflows/build-images.yml`) on every push to `main`. For
production deployments, pin a specific SHA tag instead of `:latest`, or
use an image-overlay approach (Kustomize, ArgoCD image updater, Flux).

### Pinning to a specific image

```bash
kubectl set image deployment/redactly-app \
  web=ghcr.io/moritz-hauff-it/redactly-app:abc1234 \
  -n redactly
```

### ClusterIssuer

If your cluster uses a different cert-manager issuer name, edit the
annotation in the Ingress file:

```yaml
annotations:
  cert-manager.io/cluster-issuer: <your-issuer-name>
```

### NetworkPolicy

`deploy/k8s/networkpolicy.yaml` enforces strict network isolation:

- **Ingress**: only pods from the `ingress-nginx` namespace can reach
  the app on port 8080.
- **Egress**: only DNS (port 53) is permitted — the server cannot make
  outbound connections.

This is defence-in-depth: even if someone compromised the nginx process,
it could not exfiltrate data. User content never reaches the server
anyway (all processing is client-side) — the NetworkPolicy makes that
property enforceable at the network level.

If your ingress controller lives in a differently-named namespace, update
the `namespaceSelector` in `networkpolicy.yaml`.

### HorizontalPodAutoscaler (optional)

`deploy/k8s/app/hpa.yaml` adds autoscaling between 2–5 replicas at 70%
CPU. Lightweight nginx pods rarely spike CPU, so this is mostly a
template — apply or delete as needed.

### GitOps

The included CI workflow builds and pushes images only — it does not
apply manifests to your cluster. Recommended GitOps wiring:

- **ArgoCD**: define an `Application` pointing at this repo + path
  `deploy/k8s/`. Auto-sync on push to `main`.
- **Flux**: `ImageUpdateAutomation` to watch the registry and patch the
  deployment.
- **Plain CI**: a workflow that runs `kubectl apply` against your
  cluster after image push.

---

## Directory layout

```
deploy/
├── docker-compose.yml         # single-host quick start
├── nginx/
│   └── spa.conf               # nginx config used inside the container
├── k8s/
│   ├── namespace.yaml
│   ├── networkpolicy.yaml
│   └── app/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml       # ← placeholder hostname app.example.com
│       └── hpa.yaml
└── README.md                  # this file
```
