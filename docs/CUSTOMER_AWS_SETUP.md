# Connect Your S3 Buckets to OmniTrackr

This guide will help you grant OmniTrackr **read-only access** to your S3 buckets so we can monitor file arrivals for you.

**Time needed:** 5-10 minutes

**What you'll do:**
1. Create a special user in your AWS account for OmniTrackr
2. Give it permission to read specific S3 buckets
3. Get access keys
4. Enter the keys in OmniTrackr

**Important to know:**
- ✅ You stay in complete control
- ✅ OmniTrackr can only READ files (we can't delete or modify anything)
- ✅ You can revoke access anytime with one click
- ✅ We only see file names, sizes, and dates - not file contents

---

## Step-by-Step Instructions

### Step 1: Open AWS IAM

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. In the search bar at the top, type **IAM** and click on it
3. In the left sidebar, click **Users**

### Step 2: Create a New User

1. Click the orange **Create user** button
2. Enter username: `omnitrackr-monitor`
3. Click **Next**

### Step 3: Set Permissions

Now you'll give this user permission to read your S3 buckets.

**Choose one option:**

#### Option A: Specific Buckets Only (Recommended ✅)

Use this if you only want OmniTrackr to see certain buckets.

1. Click **Create policy** (opens a new tab)
2. Click the **JSON** tab
3. Copy and paste this, **replacing the bucket names** with yours:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": [
        "arn:aws:s3:::my-company-invoices",
        "arn:aws:s3:::my-company-reports"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": [
        "arn:aws:s3:::my-company-invoices/*",
        "arn:aws:s3:::my-company-reports/*"
      ]
    }
  ]
}
```

4. **Important:** Replace `my-company-invoices` and `my-company-reports` with YOUR actual bucket names
5. Click **Next**
6. Name the policy: `OmniTrackr-Access`
7. Click **Create policy**
8. Close the policy tab and go back to the user creation tab
9. Click the refresh icon (🔄)
10. Search for `OmniTrackr-Access` and check the box
11. Click **Next**

#### Option B: All S3 Buckets

⚠️ Use this only if you want OmniTrackr to access ALL your buckets (current and future).

1. Search for: `AmazonS3ReadOnlyAccess`
2. Check the box
3. Click **Next**

### Step 4: Finish Creating the User

1. Click **Create user**
2. Done! ✅

### Step 5: Get Your Access Keys

1. Click on the username (`omnitrackr-monitor`)
2. Click the **Security credentials** tab
3. Scroll to **Access keys** and click **Create access key**
4. Choose: **Application running outside AWS**
5. Click **Next**, then **Create access key**

### Step 6: Save Your Keys (Important! ⚠️)

You'll see two keys on the screen:

```
Access Key ID:     AKIA... (20 characters)
Secret Access Key: wJal... (40 characters)
```

**Do this right now:**
1. Click **Download .csv file** (saves both keys)
2. Copy both keys somewhere safe (password manager)
3. Click **Done**

⚠️ **You can't see the secret key again!** If you lose it, you'll have to create new keys.

---

## What's Next?

### Enter Keys in OmniTrackr

1. Log in to [OmniTrackr](https://app.omnitrackr.com)
2. Go to **File Sources** → **Add New Source**
3. Choose **Amazon S3**
4. Enter:
   - **Bucket name**: (your S3 bucket name)
   - **Region**: (e.g., `us-east-1`)
   - **Access Key ID**: (paste from Step 6)
   - **Secret Access Key**: (paste from Step 6)
5. Click **Test Connection**
6. If successful ✅, click **Save**

That's it! OmniTrackr will now monitor your bucket.

---

## What Can OmniTrackr See?

OmniTrackr can ONLY see:
- ✅ File names (e.g., `invoice_2025-01-15.pdf`)
- ✅ File sizes (e.g., 2.5 MB)
- ✅ Upload dates (e.g., Jan 15, 2025 at 9:00 AM)
- ✅ Folder structure

OmniTrackr CANNOT:
- ❌ Read what's inside your files
- ❌ Delete or modify files
- ❌ Create new files
- ❌ Access other AWS services

---

## Common Questions

### "Is this secure?"

Yes! You're giving OmniTrackr **read-only** access to specific buckets. We can't modify or delete anything. You can revoke access anytime.

### "Can OmniTrackr read the data inside my files?"

No. We only read file metadata (name, size, date). We don't download or open your files.

### "What if I want to stop OmniTrackr from accessing my buckets?"

Easy! See the "How to Remove Access" section below.

### "Do I need to do this for each bucket?"

No. You can list multiple buckets in Step 3 (Option A). OmniTrackr will monitor all of them.

---

## Troubleshooting

### "Test Connection" says "Access Denied"

**Try this:**
1. Double-check your bucket name (it's case-sensitive!)
2. Make sure the IAM policy includes your bucket name
3. Verify you chose the correct AWS region

### "Invalid credentials" error

**Try this:**
1. Make sure you copied the entire key (no spaces at the beginning or end)
2. Check that the keys are "Active" in AWS (IAM → Users → Security credentials)
3. If still not working, create new keys

### Can't find my bucket

**Try this:**
1. Log in to AWS Console
2. Go to S3
3. Copy the exact bucket name from there
4. Paste it into OmniTrackr

---

## How to Remove Access

If you want to stop OmniTrackr from monitoring your buckets:

### Quick Method: Delete the Keys

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → Click `omnitrackr-monitor`
3. Click **Security credentials** tab
4. Under **Access keys**, click **Actions** → **Delete**
5. Confirm

Done! OmniTrackr immediately loses access.

### Complete Removal: Delete the User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users**
3. Check the box next to `omnitrackr-monitor`
4. Click **Delete**
5. Confirm

This removes the user and all its keys.

---

## Need Help?

**Still stuck?** We're here to help!

- 💬 **Live chat**: Click the chat icon in OmniTrackr
- 📧 **Email**: support@omnitrackr.com
- 📚 **Help center**: [help.omnitrackr.com](https://help.omnitrackr.com)

**When contacting us, tell us:**
- Your bucket name
- Your AWS region (e.g., `us-east-1`)
- The error message you're seeing

**Don't send us your access keys!** We'll never ask for them.

---

_Need to connect a different cloud storage? Check out our other guides:_
- [Microsoft Azure Blob Storage Setup](CUSTOMER_AZURE_SETUP.md)
- [Google Cloud Storage Setup](CUSTOMER_GCP_SETUP.md)
- [SFTP Setup](CUSTOMER_SFTP_SETUP.md)
