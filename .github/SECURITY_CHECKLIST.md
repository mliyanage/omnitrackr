# Security Checklist - What to Commit (and What NOT to!)

## ✅ SAFE to Commit

### Configuration Files
- ✅ `.env.example` - Template files (no real values)
- ✅ `.env.development` - Development config (if no secrets)
- ✅ `.env.test` - Test config (if no secrets)
- ✅ `terraform.tfvars` - Infrastructure config (no secrets here)
- ✅ `.terraform.lock.hcl` - Terraform provider version lock

### Code & Documentation
- ✅ All `.ts`, `.js`, `.tsx`, `.jsx` files
- ✅ All `.md` documentation files
- ✅ `package.json`, `package-lock.json`
- ✅ `Dockerfile`, `docker-compose.yml`
- ✅ `.github/workflows/*.yml` - CI/CD workflows

### Terraform Files
- ✅ `*.tf` files (infrastructure as code)
- ✅ `terraform.tfvars` (configuration, NOT secrets)
- ✅ `.terraform.lock.hcl` (provider version lock)

---

## ❌ NEVER Commit

### Environment Variables with Secrets
- ❌ `.env.local` - Local overrides with secrets
- ❌ `.env.development.local` - Dev secrets
- ❌ `.env.staging.local` - Staging secrets
- ❌ `.env.production.local` - Production secrets
- ❌ `.env.*.local` - Any file ending with `.local`

### Terraform State & Secrets
- ❌ `terraform.tfstate` - Contains secrets and resource IDs
- ❌ `terraform.tfstate.backup` - Backup of state
- ❌ `.terraform/` directory - Downloaded providers (large, not needed)
- ❌ `*.tfvars.backup` - Backup configuration files

### Cloud Credentials
- ❌ `*-credentials.json` - GCP service account keys
- ❌ `*.pem`, `*.key` - Private keys
- ❌ `*.p12`, `*.pfx` - Certificate files
- ❌ `.aws/` directory - AWS credentials
- ❌ `.gcloud/` directory - GCP credentials
- ❌ `service-account-*.json` - GCP service accounts

### Database & Secrets
- ❌ Actual database passwords
- ❌ API keys
- ❌ JWT secrets
- ❌ Encryption keys
- ❌ OAuth client secrets

---

## 🔍 How to Check Before Committing

### 1. Review Staged Files
```bash
git status
```

Look for:
- Files with "secret", "password", "credential", "key" in the name
- `.env.*.local` files
- `.tfstate` files

### 2. Run Security Audit
```bash
# Check for sensitive patterns
git diff --cached | grep -iE "password|secret|key|credential"
```

### 3. Use Git Hooks (Optional)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing secrets

if git diff --cached --name-only | grep -E "\.env\..*\.local$|\.tfstate$|credentials\.json$"; then
    echo "❌ ERROR: Attempting to commit sensitive files!"
    echo "Blocked files:"
    git diff --cached --name-only | grep -E "\.env\..*\.local$|\.tfstate$|credentials\.json$"
    exit 1
fi
```

---

## 🚨 If You Accidentally Committed Secrets

### 1. Don't Panic, But Act Fast!

### 2. Remove from History
```bash
# Remove file from Git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret/file" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (⚠️ dangerous, coordinate with team!)
git push origin --force --all
```

### 3. Rotate the Compromised Secrets
- **GCP**: Delete and create new service account keys
- **AWS**: Deactivate and create new access keys
- **Database**: Change passwords
- **JWT**: Generate new secret
- **API Keys**: Regenerate all exposed keys

### 4. Better Option: Use BFG Repo-Cleaner
```bash
# Install BFG
brew install bfg

# Remove sensitive file from history
bfg --delete-files secret-file.json

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force
```

---

## ✅ Best Practices

### For Local Development
- Use `.env.development.local` for local secrets (gitignored)
- Never hardcode secrets in code
- Use environment variables everywhere

### For Staging/Production
- Store secrets in GCP Secret Manager
- Use GitHub Secrets for CI/CD
- Never put secrets in Terraform files

### For Team Collaboration
- Share `.env.example` with placeholder values
- Document what secrets are needed
- Use secure channels (1Password, etc.) to share actual secrets

---

## 🔐 Where Secrets Should Live

| Secret Type | Local Dev | Staging | Production | CI/CD |
|-------------|-----------|---------|------------|-------|
| Database Password | `.env.*.local` | GCP Secret Manager | GCP Secret Manager | GitHub Secrets |
| JWT Secret | `.env.*.local` | GCP Secret Manager | GCP Secret Manager | GitHub Secrets |
| API Keys | `.env.*.local` | GCP Secret Manager | GCP Secret Manager | GitHub Secrets |
| Service Account Keys | Local file (not in repo) | N/A | N/A | GitHub Secrets |

---

## 📚 Related Files

- `.gitignore` - Main ignore rules
- `.dockerignore` - Docker build ignore rules
- `infrastructure/terraform/staging/.gitignore` - Terraform-specific rules

---

_Remember: When in doubt, DON'T commit it! You can always add it later, but removing it from history is hard._
