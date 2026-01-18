# MeltingHack V2.0

Advanced Vehicle Diagnostic Interface with 3D Visualization and AI Analysis.

## Features
- **3D Digital Twin**: Interactive Volvo S90 model using Three.js.
- **AI Diagnostics**: Powered by Qwen-Turbo for fault analysis and repair estimation.
- **Full System Scan**: Simulated ECU scanning with visual feedback.
- **AR Overlay**: 3D spatial labels for fault location.

## Setup
1. Clone the repository.
2. Serve the directory using any static file server.
   ```bash
   python -m http.server 8000
   # or
   npx http-server
   ```
3. Open `http://localhost:8000`.

## Tech Stack
- HTML5 / CSS3 (Glassmorphism UI)
- JavaScript (ES6 Modules)
- Three.js (3D Rendering)
- GSAP (Animations)
- FontAwesome (Icons)
