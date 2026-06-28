# ARCADE_PILOT // Computer Vision 3D Flight Simulator

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Web%20App-00ffcc?style=for-the-badge)](https://gnikhila-92.github.io/drone-simulator/)
[![Built With](https://img.shields.io/badge/Made%20With-Three.js%20%26%20MediaPipe-ff0055?style=for-the-badge)](https://github.com/GNikhila-92/drone-simulator)

A browser-native, retro-futuristic 3D flight evasion game controlled entirely via real-time edge AI computer vision. Using Google MediaPipe, the application maps hand landmarks to real-time spatial physics vectors inside a WebGL environment, challenging players to navigate an infinite, procedurally generated asteroid field.

---

## 🎮 Core Flight Mechanics & Inputs

The system bypasses traditional peripheral inputs (keyboard/mouse) by translating hand telemetry frames captured via the webcam into three-axis flight variables:

| Action | Physical Gesture | Engine Translation |
| :--- | :--- | :--- |
| **Roll (X-Axis)** | Horizontal hand translation | Adjusts lateral position; applies banking tilt rotation. |
| **Throttle (Y-Axis)** | Vertical hand translation | Controls engine elevation (Altitude). |
| **Pitch (Z-Axis)** | Hand proximity depth to lens | Linear mapping shifts drone deeper/closer in space. |
| **Velocity Lock** | Thumb + Index finger pinch ($dist < 0.04$) | Freezes current coordinate vectors instantly. |

---

## 🛠️ Advanced Technical Architecture

### 1. Draggable Picture-in-Picture HUD
The computer vision preview feed features a responsive UI implementation allowing players to click-and-drag the frame anywhere within the document viewport mid-flight. Mouse tracking listeners dynamically update layout coordinates without interrupting WebGL frame cycles.

### 2. Procedural "Psyche-Class" Mesh Deformation
Asteroids are generated dynamically using high-vertex `IcosahedronGeometry`. Surface vertices are deformed procedurally via multiple overlapping trigonometric noise frequencies, carving out irregular impact craters and jagged edges modeled after the Psyche asteroid.

### 3. Face-Value Lighting Shaders
Instead of flat textures, a custom material matrix computes directional normal vector data face-by-face, colorizing the rocky surfaces with an adaptive gradient of dusty iron-oxide reds, muted grays, and dark shadowed pockets for high-fidelity ambient depth.

### 4. Bounding Box Collision System
Vector distance equations constantly calculate the clearance threshold between the aircraft and active obstacle arrays. Intersecting meshes flag an immediate structural break, shutting down the flight engine to trigger a high-speed scaling coordinate particle explosion loop before recycling state values for a clean respawn.

---

## ⚙️ Dependencies & Stack

* **Graphics Layout:** Three.js (WebGL Core Engine Architecture)
* **Edge Machine Learning:** Google MediaPipe (Hands Model API & Camera Utilities API)
* **UI/UX Design:** Semantic HTML5, CSS3 Grid/Flexbox, Monospace Telemetry HUD
* **Hosting:** GitHub Pages Pipeline Compilation

---

## 💻 Local Quickstart

To run this project locally without compilation tooling, clone the repository and initialize a lightweight local server stack:

1. Clone the repository to your environment:
   ```bash
   git clone [https://github.com/GNikhila-92/drone-simulator.git](https://github.com/GNikhila-92/drone-simulator.git)
