# 🚀 Postman Quick Start Guide

Get up and running with the OmniTrackr API in 5 minutes!

## Step 1: Import Collection (30 seconds)

1. Open **Postman**
2. Click **Import** button (top left)
3. Drag and drop or select: `OmniTrackr-API.postman_collection.json`
4. Click **Import**

## Step 2: Import Environment (15 seconds)

1. Click **Import** button again
2. Select: `Development.postman_environment.json`
3. Click **Import**
4. In top-right dropdown, select **Development**

## Step 3: Start Server (10 seconds)

```bash
npm run dev --workspace=packages/api
```

Wait for:
```
🚀 OmniTrackr API server running on port 3000
```

## Step 4: Test Health Check (5 seconds)

In Postman:
1. Expand: **OmniTrackr API → Health & Status**
2. Click: **Health Check**
3. Click: **Send** button
4. ✅ You should see: `"success": true`

## Step 5: Try an Example (1 minute)

### Option A: List File Sources (No setup needed)

1. Go to: **File Sources → Get All File Sources**
2. Click: **Send**
3. You'll see an empty list initially: `"data": []`

### Option B: Test Error Handling

1. Go to: **Error Examples → Validation Error**
2. Click: **Send**
3. See validation error response with details

### Option C: Create File Source (Requires AWS)

**Prerequisites:** AWS account with S3 bucket

1. Go to: **File Sources → Test S3 Connection**
2. Update in body:
   ```json
   {
     "awsAccessKeyId": "YOUR_KEY",
     "awsSecretAccessKey": "YOUR_SECRET",
     "bucketName": "your-bucket",
     "bucketRegion": "us-east-1",
     "monitorPath": "/"
   }
   ```
3. Click: **Send**
4. If successful, create file source:
   - Go to: **File Sources → Create S3 File Source**
   - Update the same credentials
   - Add additional required fields
   - Click: **Send**

## 🎉 You're All Set!

### What's Available?

✅ **9 File Source Endpoints** - Full CRUD operations
✅ **3 Real-World Examples** - Copy-paste templates
✅ **3 Error Examples** - Test error handling
✅ **Complete Documentation** - See README.md

### Next Steps

1. **Read the README** - Detailed docs in `README.md`
2. **Try Examples** - Check the "Examples" folder
3. **Customize** - Modify requests for your use case

### Need Help?

- 📖 Full docs: `README.md`
- 🔧 Troubleshooting: See "Troubleshooting" section in README
- 🐛 Issues: Check server logs

---

**Total Time: ~2-5 minutes** ⏱️
