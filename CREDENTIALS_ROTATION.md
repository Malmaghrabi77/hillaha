# 🔐 Supabase Credentials Rotation Guide

## ⚠️ CRITICAL: Your API Keys Were Exposed in Git History

**Status:** 🔴 ACTION REQUIRED IMMEDIATELY

Your Supabase credentials (ANON_KEY and SERVICE_ROLE_KEY) were accidentally committed to version control and are potentially compromised. This is a critical security issue.

---

## Immediate Actions (Do This Now)

### Step 1: Rotate All API Keys in Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: **hillaha-platform**
3. Navigate to: **Settings → API**
4. Under "Project API keys":
   - **Anon key** → Click the refresh icon (🔄) → Confirm rotation
   - **Service role key** → Click the refresh icon (🔄) → Confirm rotation
5. Copy the new keys and save them in your CI/CD secrets (see Step 2 & 3)

⏱️ **Time needed:** 2-3 minutes

---

### Step 2: Update GitHub Actions Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Create/update these secrets with the NEW keys from Step 1:

```
EXPO_PUBLIC_SUPABASE_URL      → https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY → [NEW anon key from Step 1]
SUPABASE_SERVICE_ROLE_KEY     → [NEW service role key from Step 1]
```

**Never commit these to git again.**

---

### Step 3: Clean Git History

Remove the exposed credentials from git history using BFG Repo-Cleaner:

```bash
# Install BFG (if not already installed)
# macOS:
brew install bfg

# Windows:
choco install bfg

# Linux:
apt-get install bfg-repo-cleaner
```

```bash
# Clone a fresh mirror of your repo
git clone --mirror https://github.com/your-org/hillaha-platform.git
cd hillaha-platform.git

# Remove all .env files from history
bfg --delete-files '.env' --delete-files '.env.*' \
    --delete-files 'apps/*/​.env*'

# Apply the cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push the cleaned history
git push --mirror

cd ..
rm -rf hillaha-platform.git
```

**⚠️ WARNING:** This rewrite history. Coordinate with team before pushing!

---

### Step 4: Update Local .env Files

Update these files with the NEW keys from Step 1:

```bash
# Root .env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[NEW key from Step 1]
SUPABASE_SERVICE_ROLE_KEY=[NEW key from Step 1]

# apps/customer/.env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[NEW key from Step 1]

# apps/driver/.env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[NEW key from Step 1]

# apps/partner/.env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[NEW key from Step 1]

# apps/services-worker/.env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[NEW key from Step 1]

# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[NEW key from Step 1]
```

**Do NOT commit these files.** They should remain in .gitignore.

---

### Step 5: Verify in CI/CD

Once keys are rotated:

1. **GitHub Actions** should automatically pick up new secrets on next run
2. Verify builds pass with new credentials
3. Test deployed apps to ensure they can connect to Supabase
4. Check Supabase dashboard for any suspicious activity in the past

---

## Long-Term Security Practices

### ✅ DO:
- Use CI/CD secrets for sensitive values (GitHub Actions, Vercel, EAS)
- Use environment variables in .env files (locally only)
- Keep .gitignore strict for `.env*` and secrets/
- Rotate credentials quarterly
- Use separate keys for different environments (dev/staging/production)
- Enable Supabase audit logging

### ❌ DON'T:
- Hardcode credentials in source code
- Commit .env files to git
- Share credentials in Slack/Discord
- Use the same key everywhere
- Reuse old credentials after rotation
- Store credentials in comments or documentation

---

## Verification Checklist

- [ ] Old keys rotated in Supabase dashboard
- [ ] New keys saved in GitHub Actions secrets
- [ ] Local .env files updated with new keys
- [ ] Git history cleaned (if critical exposure)
- [ ] All .env files in .gitignore
- [ ] Builds pass with new credentials
- [ ] Deployed apps connect successfully
- [ ] No suspicious Supabase activity detected
- [ ] Team notified of changes

---

## Files to Monitor Going Forward

Ensure these never appear in git commits:

```
.env
.env.local
.env.*.local
apps/*/.env*
apps/*/secrets/
.supabase/
```

---

## Emergency Contact

If you suspect further exposure:
1. Contact Supabase support immediately
2. Revoke all active sessions: Settings → Auth → Providers
3. Run database audit: Supabase dashboard → Logs
4. Monitor for unusual activity

---

**Last Updated:** February 2025
**Status:** 🔴 PENDING ROTATION
