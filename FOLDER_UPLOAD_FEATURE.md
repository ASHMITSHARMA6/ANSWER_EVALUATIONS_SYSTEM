# 📁 Folder Upload Feature - Complete Documentation

## Feature Overview

The Material tab now supports **batch folder uploads**, allowing teachers to upload entire folders containing multiple PDF files at once. All PDFs are automatically extracted and processed.

## ✨ What's New

### Three Upload Modes Available:

1. **📝 Paste Text** - Manual text input
2. **📄 Upload PDF** - Single PDF file
3. **📁 Upload Folder** ⭐ **NEW** - Entire folder with multiple PDFs

## 🚀 How to Use

### Step-by-Step Guide:

1. **Go to Material Tab**
   - Click "Material" in the navigation menu
   - You'll see three upload mode buttons

2. **Select "Upload Folder" Mode**
   - Click the "📁 Upload Folder" button
   - The interface switches to folder mode

3. **Select Your Folder**
   - Click "Choose Files" button
   - Your file browser opens
   - Select a **folder** (not individual files)
   - System automatically detects all PDFs in that folder

4. **Review Selected Files**
   - The UI shows: "✅ X PDF file(s) selected"
   - Only PDF files are counted and processed

5. **Upload & Process**
   - Click "📤 Upload" button
   - Progress updates show: "Uploading 1 of 5: document.pdf"
   - Each PDF is uploaded and extracted sequentially

6. **Success Confirmation**
   - Message displays: "✅ Successfully uploaded and processed X PDF file(s) from the folder!"
   - All PDFs are now indexed in the vector database
   - Ready for question generation

## 📋 Technical Details

### Frontend Changes (UploadMaterial.js):

```javascript
// New state variables
const [mode, setMode] = useState('text'); // Added 'folder' option
const [folderFiles, setFolderFiles] = useState([]);
const [uploadProgress, setUploadProgress] = useState('');
const folderInputRef = useRef(null);

// Folder file change handler
const onFolderChange = (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    const fileArray = Array.from(files);
    setFolderFiles(fileArray);
    const pdfCount = fileArray.filter(f => f.type === 'application/pdf').length;
    setMessage(`📁 Selected folder with ${fileArray.length} file(s) (${pdfCount} PDFs)`);
    setIsError(false);
  }
}

// Sequential file upload
if (mode === 'folder') {
  const pdfFiles = folderFiles.filter(f => f.type === 'application/pdf');
  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    setUploadProgress(`Uploading ${i + 1} of ${pdfFiles.length}: ${file.name}`);
    // Upload each file one by one
    await axiosInstance.post('/upload-material', fd);
  }
}
```

### HTML Input Element:
```html
<input
  type="file"
  webkitdirectory="true"   <!-- Enables folder selection -->
  directory="true"          <!-- Fallback for browsers -->
  multiple                  <!-- Accept multiple files -->
  accept=".pdf"             <!-- Filter for PDFs only -->
/>
```

### Backend:
- No backend changes required
- Existing `/api/upload-material` endpoint handles each file
- PDFs are extracted, chunked, embedded, and indexed sequentially

## ✅ Error Handling

### Scenarios Covered:

1. **No Files Selected**
   - Error: "Please select a folder with PDF files."

2. **No PDFs in Folder**
   - Error: "No PDF files found in the selected folder."
   - Filters out non-PDF files automatically

3. **PDF Extraction Fails**
   - Error: "Error uploading filename.pdf: Could not extract text..."
   - Stops processing, displays which file failed

4. **Network Error**
   - Error: "Error uploading filename.pdf: [network error details]"
   - User can retry

5. **File Size Limit Exceeded**
   - Error: "Error uploading filename.pdf: File too large"
   - Backend limit: 100MB per file (configurable in batchUploadAnswers.js)

## 📊 Features

| Feature | Details |
|---------|---------|
| **Max Files** | Unlimited (browser dependent) |
| **Max File Size** | 100MB per file |
| **Supported Formats** | PDF only |
| **PDF Type Required** | Text-based PDFs (no scanned images) |
| **Processing Order** | Sequential (one at a time) |
| **Progress Feedback** | Real-time: "Uploading X of Y: filename" |
| **Parallel Uploads** | No (sequential for stability) |
| **Retry on Error** | Manual (user can re-upload) |

## 🔧 Configuration Options

### Increase File Size Limit (Backend):

Edit `/backend/src/routes/batchUploadAnswers.js`, line 43:
```javascript
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // Change from 100MB to 200MB
  fileFilter: (req, file, cb) => {
```

### Increase Upload Timeout:

Edit `/backend/src/index.js`, line 24:
```javascript
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
```

## 🧪 Testing Checklist

- [x] Folder selection works
- [x] PDF detection filters non-PDFs
- [x] Progress messages display correctly
- [x] Sequential upload works
- [x] Error handling for empty folders
- [x] Error handling for failed uploads
- [x] Success message displays count
- [x] Files are indexed in vector DB
- [x] Syntax: No errors, builds successfully
- [x] Frontend loads without issues

## 📝 Usage Example

**Scenario:** Upload a folder with 5 study materials

```
/My_Study_Materials/
├── Module_01.pdf
├── Module_02.pdf
├── Module_03.pdf
├── README.txt          ← Will be skipped
└── Lecture_Notes.pdf

Upload Result:
✅ Successfully uploaded and processed 4 PDF file(s) from the folder!
```

## 🎯 Next Steps

1. **Open Material Tab**: Navigate to http://localhost:3000/material
2. **Click "📁 Upload Folder"** button
3. **Select a folder** with PDF files
4. **Click "📤 Upload"**
5. **Wait for confirmation** - Progress updates show file-by-file status
6. **Go to Questions tab** - Generate questions from uploaded materials

## 💡 Pro Tips

- **Organize materials** in folders by topic/module for easier uploads
- **Test with 1-2 files first** before uploading large batches
- **Check PDF quality** - Ensure PDFs are text-based, not scanned images
- **Monitor progress** - Watch the upload progress for each file
- **Batch upload answers** - Use Student Answer tab for batch student evaluation

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Folder selection doesn't appear | Check if browser supports webkitdirectory API |
| Files not processing | Verify PDFs are text-based (not images) |
| Upload hangs | Check network connection, restart browser |
| "File too large" error | Files exceed 100MB, split into smaller files |
| Only some files processed | Check error message for failed file details |

## 📦 Files Modified

- `/frontend/src/components/UploadMaterial.js` - Enhanced with folder upload
- No backend changes required (uses existing endpoint)

## ✨ Benefits

1. **Bulk Upload** - Add multiple materials at once
2. **Time Saving** - No need to upload files individually
3. **Organized** - Keep materials organized in folders
4. **Progress Tracking** - See which file is being processed
5. **Error Handling** - Graceful failure with detailed messages
6. **Seamless Integration** - Works with existing vector DB indexing

---

**Last Updated:** February 7, 2026
**Feature Status:** ✅ COMPLETE & TESTED
