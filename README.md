# KubernetesSubmissions

Repository for the [DevOps with Kubernetes (2026)](https://courses.mooc.fi/org/uh-cs/courses/devops-with-kubernetes-2026) MOOC; exercise returns and local notes.

## Quick reference

Handy commands from the course material ([First deploy](https://courses.mooc.fi/org/uh-cs/courses/devops-with-kubernetes-2026/chapter-2/first-deploy)). Prefer **declarative** YAML (`kubectl apply -f`) over imperative one-offs when you can.

### Shell setup

```bash
# Bash completion (add to ~/.bashrc)
source <(kubectl completion bash)

# Zsh
source <(kubectl completion zsh)
```

Docker CLI -> kubectl cheat sheet: [kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/](https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/).

### k3d: Local cluster

Course default: **2 agent nodes**, cluster name `k3s-default`, kubectl context `k3d-k3s-default`.

```bash
# Create cluster (tested in material with k3d v5.8.3)
k3d cluster create -a 2

# List / inspect
k3d cluster list
docker ps --filter name=k3d
k3d kubeconfig get k3s-default

# Point kubectl at the cluster
kubectl config use-context k3d-k3s-default
kubectl cluster-info

# Pause / resume (saves CPU/RAM when not exercising)
k3d cluster stop
k3d cluster start

# Remove cluster entirely
k3d cluster delete
```

**Tips**

- Do **not** run `k3d` with `sudo` (kubeconfig may end up outside `~/.kube`).
- If you get permission errors, fix [Docker post-install](https://docs.docker.com/engine/install/linux-postinstall/) (user in `docker` group).
- **Local images** (k3d only): `k3d image import <image>`, then set `imagePullPolicy: IfNotPresent` or `Never` on the deployment (`kubectl edit deployment <name>`).

### kubectl — context & discovery

```bash
kubectl config current-context
kubectl config get-contexts
kubectl config use-context k3d-k3s-default

kubectl get nodes
kubectl get all                    # current namespace
kubectl get pods -A                # all namespaces
kubectl get deployments
kubectl get replicasets

kubectl explain pod                # built-in docs
kubectl explain deployment.spec
```

### Deploy & manage workloads

**Imperative** (fine for learning; prefer YAML later):

```bash
kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1

kubectl scale deployment/hashgenerator-dep --replicas=4
kubectl set image deployment/hashgenerator-dep hashgenerator=jakousa/dwk-app1:<tag>

kubectl delete deployment hashgenerator-dep
```

**Declarative** (preferred):

```bash
kubectl apply -f manifests/deployment.yaml
kubectl delete -f manifests/deployment.yaml

# Remote manifest (course example)
kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app1/manifests/deployment.yaml
```

Minimal deployment skeleton (`manifests/deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hashgenerator-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hashgenerator
  template:
    metadata:
      labels:
        app: hashgenerator
    spec:
      containers:
        - name: hashgenerator
          image: jakousa/dwk-app1
```

Use **image tags** (not only `latest`) so rollouts pull new versions when you change the manifest.

### Logs, exec, debug

```bash
kubectl get pods
kubectl logs <pod-name>
kubectl logs -f <pod-name>              # follow
kubectl logs -f deployment/<name>       # pick a pod from the deployment

kubectl describe pod <pod-name>
kubectl describe deployment <name>

kubectl exec -it <pod-name> -- sh       # or /bin/sh, bash if present
```

### Docker (app dev, before K8s)

```bash
docker run jakousa/dwk-app1
docker build -t <user>/<image>:<tag> .
docker push <user>/<image>:<tag>
```

### Course links

| Resource | URL |
|----------|-----|
| Course | https://courses.mooc.fi/org/uh-cs/courses/devops-with-kubernetes-2026 |
| Example apps | https://github.com/kubernetes-hy/material-example |
| Submissions template | https://github.com/mluukkai/KubernetesSubmissions |

---

## Local environment (this machine)

| Tool | Version (when documented) |
|------|---------------------------|
| k3d | v5.9.0 |
| kubectl client | v1.37.2 |
| k3s (in cluster) | v1.35.5+k3s1 |

**Cluster `k3s-default`** was running with Traefik, CoreDNS, and a `hashgenerator-dep` deployment.
