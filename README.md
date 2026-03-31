# Sign-Speak: Hackathon Documentation

## 1. System Architecture

The application follows a **Client-Side First** architecture to ensure low latency for real-time translation.

- **Input Layer:** `react-webcam` captures the live video stream.
- **Processing Layer (AI):** 
    - **MediaPipe Hands:** Runs in the browser (WebAssembly) to extract 21 3D hand landmarks at ~30fps.
    - **Gesture Engine:** A custom logic layer that compares real-time landmarks with a local "Gesture Library" using Euclidean distance normalization.
- **Translation Layer:**
    - **Local Mapping:** Instant lookup for common gestures.
    - **Gemini AI (Optional):** Used for complex sentence construction or contextual translation if the gesture sequence is ambiguous.
- **Output Layer:**
    - **Web Speech API:** Provides instant Text-to-Speech (TTS) for English and Malayalam.
    - **Tailwind UI:** High-contrast mobile interface for visual feedback.

---

## 2. Gesture Similarity Logic

To handle "Local/Regional Gestures" without a massive dataset, we use a **One-Shot Learning** approach:

### Step 1: Normalization
Landmarks are relative to the camera frame. To make them scale and position invariant:
1.  **Wrist-Centric:** Subtract the Wrist coordinates (Landmark 0) from all other 20 points.
2.  **Scaling:** Divide all coordinates by the distance between the wrist and the middle finger base (Landmark 9).

### Step 2: Distance Calculation
We use **Euclidean Distance** between the normalized vector of the current hand ($V_{live}$) and the stored gesture vector ($V_{stored}$):

$$D = \sqrt{\sum_{i=1}^{21} (x_{live,i} - x_{stored,i})^2 + (y_{live,i} - y_{stored,i})^2}$$

### Step 3: Thresholding
If $D < \epsilon$ (where $\epsilon$ is a small threshold like 0.1), the gesture is recognized.

---

## 3. 48-Hour Hackathon Roadmap

### Phase 1: Foundation (Hour 1 - 8)
- [x] Project Setup (Vite + Tailwind + MediaPipe).
- [x] Basic Camera Feed & Hand Landmark Overlay.
- [x] UI Shell (Mobile-first navigation).

### Phase 2: Core Engine (Hour 9 - 20)
- [x] Implement "Record Gesture" utility to save landmark snapshots.
- [x] Build the Similarity Engine (Euclidean distance logic).
- [x] Integrate Web Speech API for basic English TTS.

### Phase 3: Malayalam & Listener Mode (Hour 21 - 32)
- [x] Map gestures to Malayalam labels.
- [x] Implement "Listener Mode" using `webkitSpeechRecognition`.
- [x] Add Gemini API for "Smart Translation" (e.g., converting "I" + "Hungry" -> "I am hungry").

### Phase 4: Polish & Demo (Hour 33 - 48)
- [x] High-contrast UI refinement (Dark mode, bold typography).
- [x] Add "History" feature to save conversation snippets.
- [x] Stress testing & latency optimization.
- [x] Record the demo video!
