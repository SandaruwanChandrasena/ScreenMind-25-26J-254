 ScreenMind — Backend Python Setup Guide

> 📌 Read this fully before starting. Follow every step in order.

---

## 👥 Team & Components

| Member | Component | Folder |
|---|---|---|
| C1 Member | Screen Logs | `app/api/v1/c1_screenlogs/` |
| C2 Member | Isolation / GPS | `app/api/v1/c2_isolation/` |
| C3 Member | Sleep Tracking | `app/api/v1/c3_sleep/` |
| C4 Member (Leader) | Social Media NLP | `app/api/v1/c4_social_media/` |

---

## ⚠️ Before You Start — Files You Need From The Leader

These files are **secret** and will never be on GitHub.  
Ask the **project leader** to send these to you privately (WhatsApp / Email):

```
✅ firebase_service_account.json
```

Place this file directly inside the `backend-python/` folder once you receive it.

---

## 🤖 Model Setup — Download Fine-tuned AI Model

> ⚠️ The AI model is NOT included in GitHub (too large — 440MB).  
> You must download it manually from Google Drive.


### Step 1 — Download the model folder
Download the `ScreenMind_model` folder from Google Drive:

```
https://drive.google.com/drive/folders/ScreenMind_model
```
> 📌 Ask the project leader for the exact Google Drive link.

---

### Step 2 — Place the model in the correct folder

After downloading, extract and place the folder here:

```
backend-python/
└── app/
    └── api/
        └── v1/
            └── c4_social_media/
                └── nlp/
                    └── ScreenMind_model/   ← place HERE
                        ├── config.json
                        ├── model.safetensors
                        ├── tokenizer_config.json
                        └── tokenizer.json
```

✅ Your `nlp/` folder should look like this in VS Code:
```
nlp/
├── ScreenMind_model/
│   ├── config.json
│   ├── model.safetensors
│   ├── tokenizer_config.json
│   └── tokenizer.json
├── emoji_masking.py
└── roberta_model.py
```

---

## 🚀 Setup — Step by Step

### Step 1 — Clone the repository
```powershell
git clone 
cd ScreenMind-25-26J-254/backend-python
```

---

### Step 2 — Create your virtual environment
```powershell
python -m venv .venv 
py -3.13 -m venv .venv
```

---

### Step 3 — Activate the virtual environment

**Windows PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Mac / Linux:**
```bash
source .venv/bin/activate
```

✅ You should see `(.venv)` at the start of your terminal.

---

### Step 4 — Install all packages
```powershell
pip install -r requirements.txt
```

---

### Step 5 — Create your `.env` file

Create a new file called `.env` inside the `backend-python/` folder and paste this:

```env
FIREBASE_CREDENTIAL_PATH=firebase_service_account.json
```

---

### Step 6 — Place the Firebase JSON file

Put the `firebase_service_account.json` file (received from the leader) inside `backend-python/`:

```
backend-python/
├── .env                          ✅ you created this
├── firebase_service_account.json ✅ received from leader
├── requirements.txt
└── app/
```

---

### Step 7 — Start the server
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
⏳ Loading your fine-tuned ScreenMind model...
✅ ScreenMind model loaded successfully!
INFO:     Application startup complete.
```

---

### Step 8 — Verify the server is running

Open your browser and go to:
```
http://localhost:8000
```

You should see:
```json
{
  "status": "success",
  "message": "ScreenMind Backend is online and ready for the team!"
}
```

Also check the interactive API docs at:
```
http://localhost:8000/docs
```

---

## 📁 Your Working Rules

> ⚠️ Each member only works inside their own component folder.

| ✅ YOUR files (touch freely) | ❌ DO NOT touch |
|---|---|
| Your own `c1_` / `c2_` / `c3_` / `c4_` folder | Other members' component folders |
| Your own `routes.py`, `service.py`, `schemas.py` | `app/main.py` |
| Your own `nlp/` subfolder (C4 only) | `app/core/config.py` |
| | `app/api/v1/router.py` |

If you need changes to `main.py` or `router.py`, **ask the leader first**.

---

## 🔧 Common Issues & Fixes

### ❌ `uvicorn` not recognized
```powershell
# Use this instead
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### ❌ `No module named uvicorn`
```powershell
# Your venv is not activated. Run this first:
.\.venv\Scripts\Activate.ps1
# Then try again
```

### ❌ `firebase_service_account.json not found`
```
Ask the project leader to send you the firebase_service_account.json file.
Place it inside the backend-python/ folder.
```

### ❌ `ScreenMind_model not found` or model loading error
```
You forgot to download the AI model!
Follow the "Model Setup" section at the top of this README.
Download from Google Drive and place in:
app/api/v1/c4_social_media/nlp/ScreenMind_model/
```

### ❌ PowerShell says "running scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🗂️ Full Project Structure

```
backend-python/
├── .env                              ← Secret (never on GitHub)
├── firebase_service_account.json     ← Secret (never on GitHub)
├── requirements.txt                  ← All packages listed here
└── app/
    ├── main.py                       ← Server entry point
    ├── core/
    │   └── config.py                 ← Firebase + environment config
    └── api/
        └── v1/
            ├── router.py             ← Registers all component routes
            ├── c1_screenlogs/        ← C1 Member's folder
            ├── c2_isolation/         ← C2 Member's folder
            ├── c3_sleep/             ← C3 Member's folder
            ├── c4_social_media/      ← C4 Leader's folder
            │   └── nlp/
            │       ├── ScreenMind_model/  ← Download from Google Drive
            │       ├── roberta_model.py
            │       └── emoji_masking.py
            └── fusion/               ← Final score combination
```

---

## 📞 Contact

If you face any issues, contact the **project leader (C4)** before changing any shared files.

---

*ScreenMind — AI-Based Mental Health Detection System*  
*Academic Year 2025/2026*