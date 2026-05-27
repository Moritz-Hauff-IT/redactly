# ArgoCD Bootstrap

## One-time bootstrap:

kubectl apply -f deploy/argocd/root.yaml

# After this, every git push to main automatically syncs.
