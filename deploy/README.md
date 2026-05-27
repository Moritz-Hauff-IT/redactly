# Deployment

de-pii ships as two static nginx containers — one for the main app (`app.<domain>`) and one for the landing page (`<domain>`). Both run fully non-root in Kubernetes.

## Prerequisites

Your cluster must have:

| Component | Notes |
|-----------|-------|
| **ingress-nginx** | `ingressClassName: nginx` is used in all Ingress resources |
| **cert-manager** | Used to issue TLS certificates via a `ClusterIssuer` |
| **A `ClusterIssuer`** | Manifests default to `letsencrypt-prod` — change the annotation if your issuer has a different name |

## Quick start

```bash
# 1. Apply the namespace first
kubectl apply -f deploy/k8s/namespace.yaml

# 2. Edit the host placeholders in both Ingress files:
#    deploy/k8s/app/ingress.yaml     → replace app.de-pii.example.com
#    deploy/k8s/landing/ingress.yaml → replace de-pii.example.com
#
#    Also replace <OWNER> in both deployment.yaml files with your GitHub username/org,
#    or set the image field to your actual image reference.

# 3. Apply everything recursively
kubectl apply -R -f deploy/k8s/
```

That's it. cert-manager will issue certificates automatically once the Ingress resources are created and DNS resolves.

## Image references

The `deployment.yaml` files contain placeholder image references:

```
ghcr.io/<OWNER>/de-pii-app:latest
ghcr.io/<OWNER>/de-pii-landing:latest
```

Replace `<OWNER>` with your GitHub username or organisation name. Images are built and pushed by the CI workflow on every push to `main` (see `.github/workflows/build-images.yml`).

### Pinning to a specific image

For production, prefer a pinned SHA tag over `:latest`:

```bash
# Example — pin the app deployment to a specific git SHA
kubectl set image deployment/de-pii-app \
  web=ghcr.io/<OWNER>/de-pii-app:abc1234 \
  -n de-pii
```

Or use **Kustomize** / **Argo CD** image overlays to manage this declaratively without editing the base manifests.

## Changing the ClusterIssuer

If your cluster uses a different issuer name, edit the annotation in both Ingress files:

```yaml
annotations:
  cert-manager.io/cluster-issuer: <your-issuer-name>   # e.g. letsencrypt-staging
```

## NetworkPolicy

`deploy/k8s/networkpolicy.yaml` enforces strict network isolation:

- **Ingress**: only pods from the `ingress-nginx` namespace can reach the apps on port 8080.
- **Egress**: only DNS (port 53) is permitted — the server cannot make any outbound connections.

This is a strong server-side privacy guarantee: even if someone compromised the nginx process, it could not exfiltrate data. (User content never reaches the server anyway — all processing is client-side — but the NetworkPolicy makes this enforceable at the network level.)

If your ingress controller lives in a differently-named namespace, update the `namespaceSelector` in `networkpolicy.yaml`:

```yaml
namespaceSelector:
  matchLabels:
    kubernetes.io/metadata.name: <your-ingress-namespace>
```

## HorizontalPodAutoscaler (optional)

`deploy/k8s/{app,landing}/hpa.yaml` adds autoscaling between 2-5 replicas triggered at 70% CPU utilization. For V1, this is mostly a template — lightweight nginx pods rarely spike CPU. Apply or delete as needed:

```bash
# Apply HPAs
kubectl apply -f deploy/k8s/app/hpa.yaml
kubectl apply -f deploy/k8s/landing/hpa.yaml

# Or skip them (all other manifests apply fine without them)
```

## Continuous deployment

The included CI workflow (`build-images.yml`) **builds and pushes images only** — it does not apply manifests to your cluster. This is intentional: you control when and how deployments happen.

Recommended CD approaches:

- **Manual**: `kubectl set image` or edit the deployment YAML and `kubectl apply`
- **Argo CD**: Point an Application at `deploy/k8s/` — Argo CD will sync on every push after you update the image tag in the overlay
- **Flux**: Similar — use an `ImageUpdateAutomation` to watch the registry and patch the deployment

## Directory layout

```
deploy/
├── nginx/
│   └── spa.conf          # nginx config shared by both apps
├── k8s/
│   ├── namespace.yaml
│   ├── networkpolicy.yaml
│   ├── app/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   └── hpa.yaml
│   └── landing/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       └── hpa.yaml
└── README.md             # this file
```
