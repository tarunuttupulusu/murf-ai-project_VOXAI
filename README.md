# VoxAI - Premium Voice-First Assistant Platform 🎙️

<div align="center">
  <h2>Say With Vox</h2>
  <p>A futuristic, AI-powered command center built for the Murf AI Hackathon.</p>
</div>

## Overview
VoxAI is a full-stack, futuristic "Elite Dark" MERN application that provides a fully-featured, voice-first AI platform. Designed for the Murf AI Hackathon, VoxAI breaks down language barriers, streamlines HR processes, and automates daily tasks through powerful voice synthesis and real-time interactions.

## Key Features
- **HR Mock Interview Trainer**: Real-time voice-to-voice interview practice using high-fidelity AI human voices.
- **Voice-Activated Task Assistant**: Create, manage, and execute tasks via voice or browser storage, fully synced with Google Calendar.
- **Automated AI Phone Call Center**: Seamless incoming/outgoing automated call management integrated directly into the dashboard.
- **Live Translator**: Break language barriers with real-time text and speech translation.
- **Premium UI/UX**: "Elite Dark" glassmorphism aesthetic with engaging micro-animations and reactive audio visuals.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas connection string
- **Murf AI API Key**
- Google Cloud Console Project (for Calendar OAuth)
- Twilio Account (for Call Center integration)

### Installation
1. Clone the repository
   ```bash
   git clone <your-github-repo-url>
   cd <your-repo-folder>
   ```

2. Install dependencies for the server
   ```bash
   cd server
   npm install
   ```

3. Install dependencies for the client
   ```bash
   cd ../client
   npm install
   ```

### 🔐 Secure API Key Management
VoxAI uses strict `.env` variables to ensure secure API key management. **Never commit your `.env` files to GitHub.** 

1. Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongo_uri
   MURF_API_KEY=your_murf_api_key
   GOOGLE_CLIENT_ID=your_google_auth_id
   GOOGLE_CLIENT_SECRET=your_google_auth_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   ```

2. Create a `.env` file in the `client` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application
Start the backend server:
```bash
cd server
npm start
# or node index.js
```

In a new terminal, start the frontend client:
```bash
cd client
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

---

## 🔌 API Usage Explanation
VoxAI integrates AI services securely through our Express backend, ensuring API keys are never exposed to the frontend client.

### Murf AI Integration
- **Text-to-Speech (TTS)**: The platform accepts text input from our chat, translation, or HR modules and sends a secure POST request from the Node.js backend to the Murf AI endpoints.
- **Voice Generation & Modulation**: The app utilizes Murf AI's voice parameters to adjust pitch, style, and tone dynamically, delivering ultra-realistic audio files to the frontend UI.
- All audio buffers and streams are parsed and played via the dynamic frontend audio visualizers.

## 🎥 Demo Video
[Insert your YouTube/Drive Link Here]

---
*Built with ❤️ for the Murf AI Hackathon*
**Tags:** `murf-ai`
