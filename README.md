# 🧠 ScreenMind

**An AI-Based Mental Health Detection System for Smartphone Addiction**


## 📌 Overview

**ScreenMind** is a research-driven, AI-powered mobile system designed to **detect early mental health risks** associated with **smartphone addiction**.
The system passively analyzes smartphone usage behavior and predicts risks related to **stress, depression, sleep disruption, social isolation, and unhealthy social media usage**.

The solution is built as a **monorepo** consisting of:

* A **React Native mobile application**
* A **Node.js + Express backend API**
* A **Python-based AI/ML inference service**



## 🎯 Research Objectives

* Detect early indicators of **stress, anxiety, and depression**
* Analyze **screen usage patterns** as digital biomarkers
* Identify **sleep disruption risk** caused by smartphone usage
* Detect **social isolation and loneliness** using mobility and communication metadata
* Analyze **social media interaction patterns** for mental health risks
* Provide **preventive insights and behavioral recommendations**



## 🧩 System Components

### 1️⃣ Mental Health Prediction from Screen Usage Logs

* Total screen time
* Unlock frequency
* Late-night usage
* App usage patterns

### 2️⃣ Sleep Disruption Risk Estimation

* Bedtime phone usage
* Notification frequency
* Usage during sleep windows
* Circadian rhythm disruption

### 3️⃣ Social Isolation & Loneliness Detection

* Mobility patterns (GPS-based)
* Communication metadata (calls/SMS frequency)
* Behavioral regularity

### 4️⃣ Social Media Interaction Analysis

* Posting and interaction frequency
* Session duration
* Late-night scrolling
* Sentiment and emotional indicators

---

## 🏗️ Project Structure (Monorepo)

```
ScreenMind/
├── ScreenMindApp/        # React Native Mobile Application
├── backend-node/         # Node.js + Express Backend API
├── backend-python/       # Python AI/ML Inference Service
├── .gitignore
└── README.md
```

---

## 📱 ScreenMindApp (Frontend)

**Technology Stack**

* React Native (JavaScript)
* Firebase Authentication
* Firebase Firestore
* Android-first implementation

**Responsibilities**

* User onboarding & consent
* Data collection (usage, sensors)
* Risk dashboards & visualizations
* Personalized recommendations
* Notifications & behavioral nudges


## 🌐 backend-node (API Backend)

**Technology Stack**

* Node.js
* Express.js
* Firebase Admin SDK

**Responsibilities**

* API gateway for the mobile app
* Firebase authentication token verification
* Secure data storage (Firestore)
* Communication with Python ML service
* Risk aggregation & recommendation logic


## 🤖 backend-python (AI / ML Backend)

**Technology Stack**

* Python
* FastAPI (recommended)
* Machine Learning / Deep Learning models

**Responsibilities**

* Feature engineering
* Risk prediction for each component
* Model inference
* Returning explainable risk scores


## 🔐 Privacy & Ethics

* No content of messages or calls is recorded
* Only metadata and behavioral patterns are analyzed
* All data is anonymized
* User consent is mandatory
* Users can opt-out at any time

## 📊 Expected Outcomes

* Early detection of mental health risks
* Improved user awareness of digital behavior
* Preventive mental health support
* Scalable, privacy-preserving AI system

## 🎓 Academic Context

This project is developed as a **Final Year Research Project** in the field of:

* Artificial Intelligence
* Mobile Computing
* Digital Mental Health
* Behavioral Data Analysis

## 👨‍💻 Contributors

* **ScreenMind Research Team**
* Sri Lanka Institute of Information Technology (SLIIT)

## 📄 License

This project is for **academic and research purposes only**.


