# 🎯 Step-by-Step: Fix Hugging Face API Access

## Your Current Problem

```
API Key: hf_YOUR_OLD_TOKEN

All API calls return: 404 Not Found

Why? 
→ Key doesn't have permission to use models
→ You need to "agree to access" each model
```

---

## ✅ Solution: Follow These 8 Steps Exactly

### **STEP 1: Delete Old Key** (1 minute)

1. Open: https://huggingface.co/settings/tokens
2. Look for your key: `hf_YOUR_OLD_TOKEN`
3. Click the **trash/delete icon** on the right
4. Confirm deletion

**Why?** Clean start, avoid conflicts

---

### **STEP 2: Verify Your Email** (2 minutes if needed)

1. Go to: https://huggingface.co/settings/account
2. Look for "Email" section
3. If it shows **"Unverified"**:
   - Click "Verify email"
   - Check your inbox
   - Click the verification link
4. If it shows **"Verified"**: Skip this step

**Why?** HF requires verified email for API

---

### **STEP 3: Create New API Token** (1 minute)

1. Go to: https://huggingface.co/settings/tokens
2. Click **"New token"** button (blue)
3. Fill in form:
   ```
   Name: TES-App-Key
   Type: Read ← SELECT THIS!
   Expiration: No expiration
   ```
4. Click **"Generate token"**
5. **COPY THE ENTIRE TOKEN IMMEDIATELY**
   - It's only shown once!
   - Format: `hf_xxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it in a text file temporarily

**Example of what you'll see:**
```
hf_abcdefghijklmnopqrstuvwxyz123456789ABCD
```

**Why?** Fresh token with proper permissions

---

### **STEP 4: Grant Access to GPT2 Model** (1 minute)

1. Open: https://huggingface.co/gpt2
2. You might see a message like "This model cannot be used"
3. Look for and click: **"Access repository"** button
4. If prompted, agree to terms
5. Wait for page to refresh

**Why?** Allows your key to use this model

---

### **STEP 5: Grant Access to Mistral Model** (1 minute)

1. Open: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2
2. Click: **"Access repository"** if you see it
3. Agree to any terms
4. Wait for page to refresh

**Why?** Allows your key to use this model

---

### **STEP 6: Grant Access to Zephyr Model** (1 minute)

1. Open: https://huggingface.co/HuggingFaceH4/zephyr-7b-beta
2. Click: **"Access repository"** if you see it
3. Agree to any terms
4. Wait for page to refresh

**Why?** Allows your key to use this model

---

### **STEP 7: Update Your Application** (2 minutes)

1. **Open file:** `/home/ansh/Desktop/TES/backend/.env`

2. **Find this line:**
   ```
   HUGGING_FACE_API_KEY=hf_YOUR_OLD_TOKEN
   ```

3. **Replace it with:**
   ```
   HUGGING_FACE_API_KEY=hf_YOUR_NEW_TOKEN_HERE
   ```
   
   Example:
   ```
   HUGGING_FACE_API_KEY=hf_abcdefghijklmnopqrstuvwxyz123456789
   ```

4. **Save the file** (Ctrl+S)

**Why?** App needs to use your new key

---

### **STEP 8: Restart Backend** (1 minute)

Run these commands in terminal:

```bash
# Kill any running processes
pkill -9 node

# Wait a moment
sleep 2

# Start backend
cd /home/ansh/Desktop/TES/backend
node src/index.js
```

You should see:
```
[VectorDB] Loaded from file: { material: 2294, answers: 0, dimension: 384 }
Server running on http://localhost:5000
MongoDB connected
```

**Why?** Load the new .env configuration

---

## 🧪 Test Your Setup

After restart, try this:

1. Go to: http://localhost:3000
2. Upload study material (if you haven't)
3. Click "Generate Questions"
4. **Check backend logs** - you should see:
   ```
   [AI] 🚀 Calling Hugging Face API...
   [AI] ✅ Hugging Face API call successful
   [AI] ✅ Successfully generated questions via API
   ```

---

## ✅ Success Checklist

- [ ] Deleted old API key
- [ ] Verified email (if needed)
- [ ] Created new API key
- [ ] Clicked "Access repository" on GPT2
- [ ] Clicked "Access repository" on Mistral
- [ ] Clicked "Access repository" on Zephyr
- [ ] Updated .env file with new key
- [ ] Restarted backend server
- [ ] Tested by generating questions

---

## 🆘 If Still Not Working

### Check 1: Did you click "Access repository" on ALL 3 models?
- This is the #1 mistake!
- Go back and make sure you see checkmarks

### Check 2: Is your email verified?
- Go to: https://huggingface.co/settings/account
- Must show "Verified"

### Check 3: Did you use the NEW key in .env?
- Not the old one
- Should be the one you just copied

### Check 4: Did you restart the backend?
- Kill all node processes: `pkill -9 node`
- Restart: `cd /home/ansh/Desktop/TES/backend && node src/index.js`

### If Still Failing: Use Alternative
```bash
# Use the local intelligent generator (works without API)
# App will automatically fallback if API fails
# Questions will still be generated, just local instead of AI
```

---

## 📞 Need Help?

1. Show me your new API key (first 10 chars): `hf_XXXXXXXXXX...`
2. Confirm which step you completed
3. Share backend error messages
4. I'll help debug it

---

## 🎯 The Timeline

```
Step 1-2:  Delete key + verify email (2-3 min)
Step 3:    Create new key (1 min)
Step 4-6:  Click "Access" 3 times (3 min)
Step 7-8:  Update .env + restart (2 min)
─────────────────────────────────────────
Total:     ~11 minutes

Then test: 2 minutes

Total time: ~13 minutes to working API!
```

---

## 🚀 After You Complete This

**Reply with:**
1. Your NEW API key (at least first 20 characters)
2. Any error messages you see
3. Confirmation of what steps you completed

**Then I'll:**
1. Update your .env automatically
2. Restart the backend
3. Test it works
4. Confirm with backend logs

---

**Start here: https://huggingface.co/settings/tokens** 👇

You've got this! 💪
