# Google Cloud Console Setup

This guide walks you through creating the Google OAuth credentials InboxPilot needs to access Gmail.

## 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it "InboxPilot" → **Create**

## 2. Enable the Gmail API

1. In your project, go to **APIs & Services → Library**
2. Search for "Gmail API"
3. Click **Gmail API** → **Enable**

## 3. Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** → **Create**
3. Fill in:
   - App name: `InboxPilot`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through Scopes (leave defaults for now)
5. Add yourself as a **Test user** (under "Test users" step)
6. Click **Save and Continue** → **Back to Dashboard**

> **Production note:** For production use with more than your own account, Google requires verification of sensitive scopes. During development, your app works in "Testing" mode for up to 100 test users.

## 4. Create OAuth credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `InboxPilot Dev`
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google`
   - (For production: `https://yourdomain.com/api/auth/callback/google`)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## 5. Set environment variables

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## 6. Gmail API scopes

InboxPilot requests these scopes:

| Scope | Why |
|-------|-----|
| `gmail.readonly` | Read message metadata (sender, subject, date) |
| `gmail.labels` | Create and list Gmail labels |
| `gmail.modify` | Apply labels to messages via batchModify |

InboxPilot never reads email bodies — only metadata headers.

## Troubleshooting

**"Access blocked: InboxPilot has not completed the Google verification process"**
Add your Google account as a test user in the OAuth consent screen settings.

**"redirect_uri_mismatch"**
Make sure the redirect URI in Google Cloud matches exactly: `http://localhost:3000/api/auth/callback/google`

**"This app isn't verified"**
Click "Advanced" → "Go to InboxPilot (unsafe)" — this warning appears for unverified apps during development.
