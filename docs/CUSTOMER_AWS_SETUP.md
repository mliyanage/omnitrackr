# AWS Setup Guide for OmniTrackr Customers

**For Customers**: How to configure AWS credentials for OmniTrackr to monitor your S3 buckets.

---

## 🎯 Overview

OmniTrackr is a **SaaS platform** that monitors file arrivals in your S3 buckets. To do this, you need to:

1. Create a dedicated IAM user in **your AWS account**
2. Grant read-only permissions to specific S3 buckets
3. Generate access keys
4. Provide the keys to OmniTrackr

**Important**:
- ✅ You maintain full control of your AWS account
- ✅ You can revoke access anytime
- ✅ OmniTrackr only gets READ access to specified buckets
- ✅ Your credentials are encrypted and isolated from other customers

---

## 📋 Step-by-Step Setup

### Step 1: Log in to AWS Console

1. Go to: https://console.aws.amazon.com/
2. Sign in with your AWS account
3. Navigate to **IAM** (Identity and Access Management)

### Step 2: Create a Dedicated IAM User

1. In IAM, click **Users** → **Create user**
2. **Username**: `omnitrackr-service-account`
3. Click **Next**

### Step 3: Set Permissions

#### Option A: Monitor Specific Buckets (Recommended)

Create a custom policy for the buckets you want to monitor:

1. Click **Attach policies directly**
2. Click **Create policy**
3. Switch to **JSON** tab
4. Paste this policy (replace bucket names):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OmniTrackrListBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-1",
        "arn:aws:s3:::your-bucket-2",
        "arn:aws:s3:::your-bucket-3"
      ]
    },
    {
      "Sid": "OmniTrackrReadObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectMetadata",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-1/*",
        "arn:aws:s3:::your-bucket-2/*",
        "arn:aws:s3:::your-bucket-3/*"
      ]
    }
  ]
}
```

5. **Replace** `your-bucket-1`, `your-bucket-2`, etc. with your actual bucket names
6. Click **Next: Tags** (optional)
7. Click **Next: Review**
8. **Policy Name**: `OmniTrackr-S3-ReadOnly`
9. **Description**: `Read-only access for OmniTrackr file monitoring`
10. Click **Create policy**

11. Go back to the user creation page
12. Click the refresh button
13. Search for `OmniTrackr-S3-ReadOnly`
14. Check the box next to your policy
15. Click **Next**

#### Option B: Monitor All S3 Buckets

⚠️ **Less secure** - grants access to all current and future buckets

1. Click **Attach policies directly**
2. Search for: **AmazonS3ReadOnlyAccess**
3. Check the box
4. Click **Next**

### Step 4: Review and Create

1. Review the user details
2. Click **Create user**
3. ✅ User created!

### Step 5: Generate Access Keys

1. Click on the username you just created
2. Go to **Security credentials** tab
3. Scroll down to **Access keys** section
4. Click **Create access key**
5. Select use case: **Application running outside AWS**
6. Click **Next**
7. (Optional) Add description: "OmniTrackr file monitoring"
8. Click **Create access key**

### Step 6: Save Your Credentials

**⚠️ CRITICAL**: You'll see your credentials **only once**!

```
Access Key ID:     AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Do this now:**
1. ✅ Download the CSV file
2. ✅ Copy both keys to a secure password manager
3. ✅ Keep them confidential - never share publicly

**You cannot retrieve the secret key again!** If lost, you'll need to create new keys.

---

## 🧪 Test Your Setup (Optional)

Before providing credentials to OmniTrackr, verify they work:

### Method 1: Using AWS CLI

```bash
# Install AWS CLI if needed
# https://aws.amazon.com/cli/

# Configure with your new credentials
aws configure --profile omnitrackr
# Enter your Access Key ID
# Enter your Secret Access Key
# Enter your region (e.g., us-east-1)
# Enter output format: json

# Test listing a bucket
aws s3 ls s3://your-bucket-name --profile omnitrackr

# Test reading a specific path
aws s3 ls s3://your-bucket-name/your/path/ --profile omnitrackr
```

If successful, you'll see a list of files.

### Method 2: Using OmniTrackr Test Connection

You can test directly in OmniTrackr:
1. Log in to OmniTrackr
2. Go to **File Sources** → **Add New**
3. Click **Test Connection** button
4. Enter your credentials and bucket details
5. Click **Test**

---

## 🔐 What Permissions Does OmniTrackr Need?

OmniTrackr needs **READ-ONLY** access to:

| Permission | What It Does | Required? |
|------------|--------------|-----------|
| `s3:ListBucket` | List files in your bucket | ✅ Required |
| `s3:GetBucketLocation` | Verify bucket region | ✅ Required |
| `s3:GetObject` | Read file metadata (size, date) | ✅ Required |
| `s3:GetObjectMetadata` | Get additional file properties | ⚠️ Optional |
| `s3:GetObjectVersion` | Support versioned buckets | ⚠️ Optional |

**Important**:
- ❌ OmniTrackr does **NOT** download file contents
- ❌ OmniTrackr does **NOT** modify or delete files
- ❌ OmniTrackr does **NOT** create new files
- ✅ OmniTrackr only reads file metadata (name, size, timestamp)

---

## 🔒 Security Best Practices

### 1. Use Least Privilege

✅ **DO**: Grant access only to specific buckets you want to monitor
```json
"Resource": [
  "arn:aws:s3:::finance-reports",
  "arn:aws:s3:::sales-data"
]
```

❌ **DON'T**: Grant full S3 access or wildcard permissions
```json
"Resource": "arn:aws:s3:::*"
```

### 2. Monitor Usage

Enable CloudTrail to monitor API calls:
1. AWS Console → CloudTrail
2. Create a trail
3. Monitor `ListBucket` and `GetObject` calls
4. Set up alerts for suspicious activity

### 3. Rotate Keys Regularly

Best practice: Rotate every 90 days

1. Create new access keys
2. Update OmniTrackr with new keys
3. Test everything works
4. Deactivate old keys
5. Delete old keys after verification period

### 4. Use Bucket Policies (Optional)

Add an extra layer by restricting the IAM user via bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOmniTrackrReadOnly",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:user/omnitrackr-service-account"
      },
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

---

## 🚨 Troubleshooting

### Error: "Access Denied"

**Possible causes:**
- Missing permissions on the IAM policy
- Wrong bucket name
- Bucket in different region

**Solution:**
1. Verify bucket name is correct (case-sensitive)
2. Check IAM policy includes both bucket and bucket/* resources
3. Verify bucket region matches

**Test manually:**
```bash
aws s3 ls s3://your-bucket-name --profile omnitrackr
```

### Error: "Invalid credentials"

**Possible causes:**
- Copied keys incorrectly
- Extra spaces in keys
- Keys were deactivated

**Solution:**
1. Verify you copied the full key (no truncation)
2. Check for extra spaces at start/end
3. In AWS Console, verify keys are "Active"
4. Try creating new keys if needed

### Error: "Bucket not found"

**Possible causes:**
- Typo in bucket name
- Bucket in different AWS account
- Bucket was deleted

**Solution:**
1. List all your buckets: `aws s3 ls`
2. Verify the bucket exists
3. Check you're in the right AWS account

---

## 🔄 How to Revoke Access

If you want to stop OmniTrackr from accessing your S3 buckets:

### Option 1: Deactivate Keys (Temporary)

1. AWS Console → IAM → Users
2. Click on `omnitrackr-service-account`
3. Security credentials tab
4. Find the access key
5. Click **Actions** → **Deactivate**
6. OmniTrackr will immediately lose access

### Option 2: Delete Keys (Permanent)

1. Follow steps above
2. Click **Actions** → **Delete**
3. Confirm deletion
4. OmniTrackr will immediately lose access

### Option 3: Delete User (Complete Removal)

1. AWS Console → IAM → Users
2. Select `omnitrackr-service-account`
3. Click **Delete**
4. Confirm deletion
5. All access keys are automatically deleted

---

## 📊 What Data Does OmniTrackr Access?

OmniTrackr reads **metadata only**:

### ✅ What OmniTrackr Reads
- File names
- File sizes
- Last modified timestamps
- File paths
- Bucket names
- Object count

### ❌ What OmniTrackr Does NOT Read
- File contents
- File data
- Personal information inside files
- Other AWS services (EC2, RDS, etc.)
- Other buckets (unless explicitly granted)

**Example**: For a file `report_2025-01-15.csv`:
- ✅ Reads: `report_2025-01-15.csv`, size: 2.5 MB, modified: 2025-01-15 09:00:00
- ❌ Does NOT read: CSV contents, data rows, customer information

---

## 🌍 Supported AWS Regions

OmniTrackr supports all AWS regions:

| Code | Region |
|------|--------|
| `us-east-1` | US East (N. Virginia) |
| `us-east-2` | US East (Ohio) |
| `us-west-1` | US West (N. California) |
| `us-west-2` | US West (Oregon) |
| `eu-west-1` | Europe (Ireland) |
| `eu-west-2` | Europe (London) |
| `eu-central-1` | Europe (Frankfurt) |
| `ap-southeast-1` | Asia Pacific (Singapore) |
| `ap-southeast-2` | Asia Pacific (Sydney) |
| `ap-northeast-1` | Asia Pacific (Tokyo) |
| `ap-south-1` | Asia Pacific (Mumbai) |
| `sa-east-1` | South America (São Paulo) |

Full list: https://docs.aws.amazon.com/general/latest/gr/s3.html

---

## 📞 Need Help?

**Before contacting support**, please verify:
- [ ] IAM user is created
- [ ] Access keys are generated and active
- [ ] Policy is attached to the user
- [ ] Bucket name is correct
- [ ] Region is correct
- [ ] You can list the bucket via AWS CLI

**Contact OmniTrackr Support:**
- Email: support@omnitrackr.com
- Help Center: https://help.omnitrackr.com
- Live Chat: Available in app

**When contacting support, provide:**
- AWS region
- Bucket name(s)
- Error message
- IAM policy JSON (remove sensitive info)

**Never share:**
- ❌ Access Key ID
- ❌ Secret Access Key
- ❌ AWS Account ID (unless specifically requested)

---

## ✅ Setup Checklist

Before entering credentials in OmniTrackr:

- [ ] Created IAM user: `omnitrackr-service-account`
- [ ] Created custom policy or used AmazonS3ReadOnlyAccess
- [ ] Attached policy to user
- [ ] Generated access keys
- [ ] Saved Access Key ID securely
- [ ] Saved Secret Access Key securely
- [ ] Downloaded CSV backup
- [ ] Tested credentials with AWS CLI (optional)
- [ ] Know the exact bucket name(s)
- [ ] Know the bucket region
- [ ] Know the path to monitor (e.g., `/incoming/`)
- [ ] Defined file name pattern (e.g., `*.csv`)

---

## 📚 Additional Resources

- **AWS IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **S3 Security**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html
- **CloudTrail Logging**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging.html
- **OmniTrackr Documentation**: https://docs.omnitrackr.com

---

## 🎯 Quick Summary

1. **Create IAM user** in your AWS account
2. **Grant S3 read permissions** to specific buckets
3. **Generate access keys**
4. **Save keys securely**
5. **Enter in OmniTrackr**
6. **Test connection**
7. **Start monitoring!**

**Remember**: You control access. You can revoke anytime.

---

_Last Updated: 2025-10-27_
