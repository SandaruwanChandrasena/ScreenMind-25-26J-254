# 🧠 ScreenMind  
**An AI-Based Mental Health Detection System for Smartphone Addiction**

🔗 GitHub Repository: https://github.com/SandaruwanChandrasena/ScreenMind-25-26J-254.git


## 1️⃣ Project Overview

### 📌 Project Title  
**ScreenMind: An AI-Based Mental Health Detection System for Smartphone Addiction**

### 🧩 Problem Domain, Research Purpose & Motivation

Excessive smartphone usage has become a significant contributor to **mental health challenges**, particularly among young adults. Prolonged screen time, late-night phone usage, reduced physical mobility, and unhealthy social media engagement are strongly associated with **stress, depression, sleep disorders, reduced psychological satisfaction, lowered energy levels, and social isolation**.

Despite the growing prevalence of these issues, most existing digital wellbeing and mental health solutions rely heavily on **self-reported data**, which is often subjective, inconsistent, delayed, and prone to user bias. This limits their effectiveness in detecting early mental health risks and providing timely support.

The primary purpose of this research is to **identify and predict the negative impacts of excessive smartphone usage on mental health** through a **passive, data-driven, and privacy-preserving approach**. By analyzing smartphone usage logs, mobility patterns, communication behavior, sensor data, and social media interaction patterns, the proposed AI-based system aims to:

- Detect early signs of smartphone addiction-related mental health risks  
- Predict potential mental health deterioration using machine learning and deep learning models  
- Support preventive interventions to improve users' overall mental well-being and daily functioning  

A core focus of **ScreenMind** is **early intervention**. Rather than waiting for users to seek clinical or professional mental health support, ScreenMind functions as a **"Digital Guardian"** that continuously monitors behavioral patterns and identifies correlations between digital habits and mental well-being. This empowers users to recognize harmful usage trends early and take corrective action **before clinical intervention becomes necessary**.

---

## 🔬 Research Components & AI Models

The system is powered by four specialized research modules designed to detect early indicators of mental health challenges through passive sensing.

### 1️⃣ Mental Health Predictor (Screen Usage)

* **Focus:** Anxiety & Addiction detection.
* **Data Sources:** Total screen time, unlock frequency, session duration, and app category distribution.
* **AI Technique:** **Random Forest / Decision Trees** used to classify usage patterns into risk levels based on compulsive behavior markers.

### 2️⃣ Sleep Disruption Risk Estimation

* **Focus:** Circadian Rhythm Health & Sleep Quality.
* **Data Sources:** Ambient light sensors, accelerometer movement, screen-off timestamps, and late-night notification frequency.
* **AI Technique:** **LSTM (Long Short-Term Memory)** networks to analyze time-series data and identify deviations from healthy sleep windows.

### 3️⃣ Social Isolation & Loneliness Detection

* **Focus:** Depression & Social Withdrawal.
* **Data Sources:** Mobility patterns (GPS radius/entropy), communication metadata (Call/SMS ratios), and behavioral regularity.
* **AI Technique:** **K-Means Clustering** to detect significant reductions in "Life Space" and shifts in social interaction frequency.

### 4️⃣ Social Media Interaction Analysis

* **Focus:** Mood & Emotional State monitoring.
* **Data Sources:** Scroll speed, typing cadence, session duration, and notification sentiment.
* **AI Technique:** **NLP (Natural Language Processing)** for sentiment analysis combined with **Behavioral Regression** models to map interaction speed to emotional volatility.

---

### 🎯 Main Objectives

The primary objectives of **ScreenMind** are to:

* Detect early indicators of **stress, anxiety, and depression**
* Identify **smartphone addiction patterns** using screen usage logs
* Estimate **sleep disruption risk** caused by phone usage behavior
* Detect **social isolation and loneliness** using mobility and communication metadata
* Analyze **social media interaction patterns** for mental health risk
* Provide **preventive insights and awareness** to encourage healthier digital habits

---

### 👥 Target Users / Stakeholders

* University students and young adults
* Individuals with high smartphone dependency
* Mental health researchers and academics
* Healthcare and digital wellbeing stakeholders

---

### ⚙️ High-Level System Functionality

At a high level, ScreenMind:

1. Collects passive smartphone usage and behavioral data
2. Processes and stores data securely in the backend
3. Uses AI/ML models to predict mental health risk levels
4. Displays personalized insights and risk indicators via a mobile dashboard
5. Encourages healthier smartphone usage through awareness and recommendations

---

## System Architecture

### 🏗️ Architecture Overview

ScreenMind follows a **multi-tier architecture** consisting of:

* A **mobile frontend** for data collection and visualization
* A **Node.js backend** acting as an API gateway and data manager
* A **Python-based AI/ML service** for mental health risk prediction
* **Firebase** for authentication and secure data storage

> 📌 **Architecture Diagram**
>
![System Architecture](https://github.com/user-attachments/assets/7796d8a4-1485-480a-8db4-71549aa3759b)

---

### 🧩 Frontend – Mobile Application (ScreenMindApp)

**Technology Stack**

* React Native (JavaScript)
* Firebase Authentication
* Firebase Firestore
* Android-first implementation

**Responsibilities**

* User registration, authentication, and consent management
* Passive data collection (screen usage, timestamps, basic sensors)
* Displaying dashboards for:

  * Screen usage risk
  * Sleep disruption
  * Social isolation
  * Social media behavior
* Presenting AI-generated mental health risk insights
* User-friendly, calm UI designed for mental wellbeing

---

### 🌐 Backend – API Layer (backend-node)

**Technology Stack**

* Node.js
* Express.js
* Firebase Admin SDK

**Responsibilities**

* Acts as the central API gateway
* Verifies Firebase authentication tokens
* Stores and retrieves user data from Firestore
* Aggregates behavioral data
* Communicates with the Python AI service
* Sends processed results back to the mobile app

---

### 🤖 AI / ML Backend (backend-python)

**Technology Stack**

* Python
* FastAPI (recommended)
* Machine Learning / Deep Learning models

**Responsibilities**

* Feature extraction and preprocessing
* Mental health risk prediction per component:

  * Screen usage addiction risk
  * Sleep disruption risk
  * Social isolation risk
  * Social media mental health risk
* Model inference and scoring
* Returning explainable risk outputs to the Node.js backend

---

### 🗄️ Database & Storage

**Firebase Firestore**

* Stores anonymized user behavior data and AI prediction results.
* Maintains user profiles and consent records.

**Firebase Storage**

* **Cloud Storage for Firebase:** Used for uploading and serving user profile images and media assets.
* Provides robust uploads regardless of network quality.

**Firebase Authentication**

* Secure user authentication (Email/Password, Google, etc.).
* Token-based access control to ensure users can only access their own uploaded images.

---

### 🔄 Data Flow Between Components

1. User interacts with the **ScreenMind mobile app**
2. Behavioral data is collected and sent to the **Node.js backend**
3. Backend stores raw data in **Firestore**
4. Backend sends processed features to the **Python AI service**
5. AI service returns **risk predictions**
6. Backend aggregates results and stores them
7. Mobile app fetches results and displays insights to the user

---

## 🏗️ Project Structure (Monorepo)

```bash
ScreenMind/
├── ScreenMindApp/        # 📱 React Native Frontend + Sensors
├── backend-node/         # ⚙️ API Gateway & Logic Layer
├── backend-python/       # 🧠 AI/ML Inference Service
├── .gitignore            # Configuration
└── README.md             # Documentation
```

---

## 👥 Team & Components

| Member | Component | Folder |
|---|---|---|
| C1 Member | Screen Logs | `app/api/v1/c1_screenlogs/` |
| C2 Member | Isolation / GPS | `app/api/v1/c2_isolation/` |
| C3 Member | Sleep Tracking | `app/api/v1/c3_sleep/` |
| C4 Member (Leader) | Social Media NLP | `app/api/v1/c4_social_media/` |

---

## ▶️ How to Run the Project

### 📌 Prerequisites

Ensure the following software is installed on your system:

* **Node.js** (v18+ recommended)
* **npm** 
* **Python** (v3.9+ recommended)
* **Android Studio** (for Android emulator)
* **Java JDK 17** (for Android builds)
* **Firebase Project** (Authentication + Firestore enabled)

---

### 📱 1. Run the Mobile Application (ScreenMindApp)

```bash
cd ScreenMindApp
npm install
```

Start the Metro bundler:

```bash
npm start
```

Run the Android app:

```bash
npm run android
```

> ⚠️ Ensure an Android emulator is running or a physical device is connected.

---

### 🌐 2. Run the Node.js Backend (backend-node)

```bash
cd backend-node
npm install
```

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

Start the backend server:

```bash
npm start
```

The backend will run at:

```
http://localhost:3000
```

---

### 🤖 3. Run the Python AI Backend (backend-python)

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
git clone https://github.com/SandaruwanChandrasena/ScreenMind-25-26J-254.git
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

## 🔐 Privacy & Ethical Considerations

* No message, call, or content data is collected
* Only behavioral metadata and usage patterns are analyzed
* All data is anonymized and securely stored
* User consent is mandatory before data collection
* Users can opt out and delete data at any time
* Designed in alignment with ethical AI and digital wellbeing principles

---

## 📊 Expected Outcomes

* Early detection of mental health risk indicators
* Improved awareness of unhealthy smartphone behavior
* Preventive mental health support
* Scalable and privacy-preserving digital mental health system

---

## 👨‍💻 Contributors

**ScreenMind Research Group** *Sri Lanka Institute of Information Technology (SLIIT)*

* **Pomodya K.W.R** - Screen Usage & Mental Health Prediction
* **Ranathunga K.B.A.D.H** - Social Isolation & Mobility Analysis
* **Kulathunga K.G.C.N** - Sleep Disruption & Sensor Analysis
* **Chandrasena Y.P.S** - Social Media Interaction & NLP

---

## 📄 License

This project is intended for **academic and research purposes only**.
