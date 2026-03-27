# 🔑 How to Get a Working Hugging Face API Key

## Step 1: Go to Hugging Face
1. **Open**: https://huggingface.co
2. **Sign Up** (if you don't have an account)
3. **Login** to your account

## Step 2: Generate API Token
1. Click your **profile icon** (top right corner)
2. Click **"Settings"**
3. Click **"Access Tokens"** (left sidebar)
4. Click **"New token"** button

## Step 3: Create the Token
1. **Name**: Give it a name like `TES-API-Key`
2. **Type**: Select **"Read"** (not Write)
3. **Click "Generate token"**

## Step 4: Copy Your Token
- You'll see a long string starting with `hf_`
- **Copy the entire token** (it's one-time visible!)
- Example: `hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ...`

## Step 5: Update Your Application
1. Go to `/home/ansh/Desktop/TES/backend/.env`
2. Find the line: `HUGGING_FACE_API_KEY=...`
3. Replace with your **new token**

Example:
```properties
HUGGING_FACE_API_KEY=hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

## Step 6: Restart the Backend
```bash
pkill -9 node
cd /home/ansh/Desktop/TES/backend
node src/index.js
```

## ✅ IMPORTANT: Make Sure These Are Checked

### Check 1: Account Status
- ✅ You must have an **active Hugging Face account**
- ✅ Account should **not be limited/restricted**

### Check 2: Token Permissions
- ✅ Token must be type **"Read"** (not limited/deprecated)
- ✅ Token must be **recently created** (old tokens might be revoked)

### Check 3: No Rate Limiting
- ✅ Free tier allows **~100 inference calls/day**
- If you're getting rate-limited, wait a few hours or upgrade to paid

## 🧪 Test Your Key (Optional)

If you want to verify before running the app:

```bash
curl -X POST https://api-inference.huggingface.co/models/gpt2 \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"inputs":"Hello"}'
```

Replace `YOUR_API_KEY_HERE` with your actual key.

- ✅ If it works: You'll see a response
- ❌ If 401/403: Key is invalid or expired
- ❌ If 503: Service overloaded (try again later)

## 🔧 If Key Still Doesn't Work

**Option 1: Create a NEW key**
- Go back to https://huggingface.co/settings/tokens
- Delete the old one
- Create a fresh token
- Some users report that old tokens get revoked

**Option 2: Use Your Account with Python** (Advanced)
```bash
pip install huggingface-hub
huggingface-cli login
# Then paste your token
```

**Option 3: Enable Free Trial Model Access** (if needed)
- Some newer models require agreeing to license
- Visit the model page and click "Agree and access repository"
- Then try your token again

## 📝 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **401 Unauthorized** | Key is invalid or expired - create a new one |
| **403 Forbidden** | Access denied - check account restrictions |
| **429 Too Many Requests** | Rate limited - wait 1-2 hours |
| **503 Service Unavailable** | Server overloaded - try again later |
| **Token expired** | Token has been revoked - create a new one |

---

## ✨ Once You Have the Key:

1. **Update** `.env` with your new key
2. **Restart** the backend
3. **Test** by generating questions in the app
4. **You should see** real AI-generated questions OR fallback smart questions

**Both options will work!** The app now has an intelligent local fallback, so even if the API fails, you get good questions instantly.
