# Publishing to GitHub Pages

This guide covers creating a GitHub repository, pushing the project, and enabling GitHub Pages using GitHub Desktop.

---

## Prerequisites

- [GitHub Desktop](https://desktop.github.com/) installed and signed in to your GitHub account
- A GitHub account (free tier supports GitHub Pages on public repos)

---

## Step 1 — Create the repository on GitHub.com

1. Go to [github.com](https://github.com) and click **New repository** (or the **+** icon → **New repository**)
2. Set a name, e.g. `signal-to-jsonlines`
3. Set visibility to **Public** — required for GitHub Pages on free accounts
4. **Leave all other options unchecked** — do not initialise with a README, .gitignore, or licence. The .gitignore dropdown should stay as **None**; the project already has one locally that will be committed with your first push
5. Click **Create repository**
6. Copy the repository URL (e.g. `https://github.com/your-username/signal-to-jsonlines`)

---

## Step 2 — Add the local folder in GitHub Desktop

1. Open GitHub Desktop
2. Go to **File → Add Local Repository**
3. Navigate to the `SignalToJSONLines` folder and click **Add Repository**
4. If GitHub Desktop says *"this directory does not appear to be a Git repository"*, click **create a repository** in the prompt — it will initialise Git in place without moving any files

---

## Step 3 — Connect to the remote

1. In GitHub Desktop, click **Publish repository** in the top toolbar
2. In the dialog that appears, select your GitHub.com account
3. Set the name to match the repository you created in Step 1
4. Uncheck **Keep this code private** if it isn't already unchecked
5. Click **Publish repository**

Alternatively, if the repo already exists on GitHub:
1. Go to **Repository → Repository Settings**
2. Paste the GitHub URL from Step 1 into the **Primary remote repository (origin)** field
3. Click **Save**

---

## Step 4 — Commit and push

1. In GitHub Desktop you will see all project files listed as new changes in the left panel
2. In the **Summary** field at the bottom left, type: `Initial commit`
3. Click **Commit to main**
4. Click **Push origin** in the top toolbar

All files are now on GitHub.

---

## Step 5 — Enable GitHub Pages

1. On GitHub.com, go to your repository
2. Click **Settings** → scroll down to **Pages** in the left sidebar
3. Under **Source**, select **Deploy from a branch**
4. Set Branch to **main** and folder to **/ (root)**
5. Click **Save**

GitHub will build and deploy the site. After about 60 seconds, the live URL appears at the top of the Pages settings page:

```
https://your-username.github.io/signal-to-jsonlines/
```

---

## Troubleshooting

**Fetch origin shows instead of Push origin, but GitHub.com repo is empty**
GitHub Desktop may be connected to the wrong GitHub account. Check your actual username on GitHub.com (profile icon → top right) and confirm the repo exists under **Your repositories**. If the repo is under a different account or organisation, update the remote URL in **Repository → Repository Settings**.

**404 on the GitHub.com URL**
The repo name or account in the URL is wrong. Navigate to your correct account → Your repositories to find the exact URL.

---

## Updating the site

Any time you make changes locally:

1. Open GitHub Desktop — changed files appear automatically in the left panel
2. Write a summary of the change in the **Summary** field
3. Click **Commit to main**
4. Click **Push origin**

GitHub Pages redeploys automatically within a minute or two of each push.
