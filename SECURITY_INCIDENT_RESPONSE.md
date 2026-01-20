# 🚨 Security Incident Response - Exponierte Secrets

## Status: ✅ Secrets aus Repository entfernt

Die exponierten Secrets wurden aus `VERCEL_ENV_CHECKLIST.md` entfernt.

## 🔴 KRITISCH: Sofortige Maßnahmen erforderlich

### 1. Google OAuth2 Credentials rotieren

**Die exponierten Google OAuth2 Keys müssen SOFORT neu erstellt werden:**

1. Gehe zu: https://console.cloud.google.com/apis/credentials
2. Wähle das betroffene OAuth 2.0 Client ID aus
3. **Lösche die alten Credentials** oder **deaktiviere sie**
4. Erstelle **neue OAuth 2.0 Client ID**:
   - Klicke auf "Create Credentials" → "OAuth client ID"
   - Wähle Application type (Web application)
   - Trage die Authorized redirect URIs ein
   - Speichere die neuen Credentials
5. Aktualisiere in Vercel:
   - Gehe zu Vercel Dashboard → Settings → Environment Variables
   - Aktualisiere `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET` mit den neuen Werten
   - Redeploy deine Anwendung

**Alte Credentials (NIEMALS MEHR VERWENDEN):**
- Client ID: `1051026914714-3l64sao6mqmm60nojr24rl5vaap5ia4j.apps.googleusercontent.com`
- Client Secret: `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`

### 2. PostgreSQL Database Credentials rotieren

**Die exponierten Database Credentials müssen geändert werden:**

**Option A: Passwort ändern (Neon)**
1. Gehe zu: https://console.neon.tech/
2. Wähle deine Datenbank aus
3. Gehe zu Settings → Database
4. Ändere das Database-Passwort
5. Die `DATABASE_URL` wird automatisch aktualisiert
6. Aktualisiere in Vercel:
   - Gehe zu Vercel Dashboard → Settings → Environment Variables
   - Aktualisiere `DATABASE_URL` mit der neuen URL
   - Redeploy deine Anwendung

**Option B: Neue Datenbank erstellen (sicherer)**
1. Erstelle eine neue Datenbank in Neon
2. Führe Migrationen aus: `npx prisma migrate deploy`
3. Aktualisiere `DATABASE_URL` in Vercel

**Alte Database URL (NIEMALS MEHR VERWENDEN):**
```
postgresql://neondb_owner:npg_r0SjsvIVh3FP@ep-plain-salad-agmh61ck-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 3. NEXTAUTH_SECRET rotieren (optional, aber empfohlen)

Da auch der NEXTAUTH_SECRET exponiert wurde, sollte er ebenfalls geändert werden:

1. Generiere einen neuen Secret:
   ```bash
   openssl rand -base64 32
   ```

2. Aktualisiere in Vercel:
   - Gehe zu Vercel Dashboard → Settings → Environment Variables
   - Aktualisiere `NEXTAUTH_SECRET` mit dem neuen Wert
   - Redeploy deine Anwendung

**Alter Secret (NIEMALS MEHR VERWENDEN):**
- `k5dFGtURu6mCvR4NS8oQEQUZ9Ds3eRnkmkqIrx9mSc4=`

### 4. Git-Historie bereinigen

⚠️ **WICHTIG**: Die Secrets sind immer noch in der Git-Historie sichtbar!

Du musst die Secrets aus der gesamten Git-Historie entfernen:

**Option 1: Git Filter (für kleine Repositories)**
```bash
# Ersetze <OLD_SECRET> mit dem alten Secret
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch VERCEL_ENV_CHECKLIST.md" \
  --prune-empty --tag-name-filter cat -- --all
```

**Option 2: BFG Repo-Cleaner (empfohlen für große Repositories)**
1. Installiere BFG: `brew install bfg` (macOS)
2. Erstelle eine Datei `secrets.txt` mit den exponierten Secrets
3. Führe aus:
   ```bash
   bfg --replace-text secrets.txt
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```

**Option 3: GitHub Support kontaktieren**
- Wenn das Repository öffentlich ist, kontaktiere GitHub Support
- Sie können die Git-Historie bereinigen

**Danach:**
```bash
git push origin --force --all
git push origin --force --tags
```

⚠️ **WARNUNG**: Force-Push überschreibt die Historie. Stelle sicher, dass alle Team-Mitglieder ihre lokalen Repositories neu klonen.

## 📋 Checkliste

- [ ] Google OAuth2 Credentials in Google Cloud Console gelöscht/deaktiviert
- [ ] Neue Google OAuth2 Credentials erstellt
- [ ] Google OAuth2 Credentials in Vercel aktualisiert
- [ ] PostgreSQL Passwort geändert oder neue Datenbank erstellt
- [ ] DATABASE_URL in Vercel aktualisiert
- [ ] NEXTAUTH_SECRET rotiert und in Vercel aktualisiert
- [ ] Vercel Deployment neu gestartet
- [ ] Git-Historie bereinigt (optional, aber empfohlen)
- [ ] Git-Änderungen committed und gepusht
- [ ] Vercel Deployment erfolgreich getestet

## 🛡️ Prävention für die Zukunft

1. **NIEMALS** Secrets in Code-Dateien committen
2. **NIEMALS** Secrets in Markdown-Dateien oder Dokumentation
3. Verwende **NUR** Environment Variables in Vercel
4. Verwende `.env.local` für lokale Entwicklung (ist in `.gitignore`)
5. Verwende Platzhalter in Dokumentation: `<YOUR_SECRET_HERE>`
6. Aktiviere GitHub Secret Scanning in den Repository-Settings
7. Verwende Git Hooks (pre-commit) um Secrets zu verhindern

## 📚 Ressourcen

- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
