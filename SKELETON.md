# VisionTouch Project Skeleton Structure

This document details the complete production-grade, modular directory skeleton for the **VisionTouch** AI-powered human-computer interaction platform.

```text
VisionTouch/
│
├── assets/                         # Global branding resources (Logos, mockups, design specifications)
│
├── backend/                        # FastAPI high-performance microservice
│   ├── app/                        # Application source code root
│   │   ├── api/                    # API routing, controllers, and schemas
│   │   │   ├── v1/                 # Versioned REST endpoints (auth, user config, mappings)
│   │   │   └── websocket.py        # Real-time WebSocket connection manager & broker
│   │   ├── core/                   # Shared system kernels
│   │   │   ├── config.py           # System-wide configuration loader
│   │   │   ├── security.py         # JWT generation, token validators, and CORS policies
│   │   │   └── database.py         # ORM client initializer (Supabase/PostgreSQL)
│   │   ├── services/               # Underlying business logic modules
│   │   │   ├── telemetry.py        # Hardware and engine metrics aggregator (CPU, RAM, latency)
│   │   │   └── registry.py         # Custom gesture preference registry manager
│   │   └── main.py                 # FastAPI application entry point
│   ├── tests/                      # PyTest unit and integration tests
│   ├── Dockerfile                  # Container build parameters for cloud hosting
│   └── requirements.txt            # Python web-layer dependencies
│
├── desktop/                        # Native desktop wrappers & packaging configurations
│   ├── src/                        # Electron process code
│   │   ├── main.js                 # Electron main thread (window creation, OS integration)
│   │   └── preload.js              # Sandbox IPC bridge for secure browser actions
│   ├── build/                      # Native build settings (App icons, installer packages, setup templates)
│   ├── package.json                # Desktop application package file and run scripts
│   └── start.bat                   # Windows initialization launch script
│
├── docs/                           # Global technical documentation
│   ├── architecture.md             # Data pipelines, network topology, and state maps
│   ├── deployment.md               # Guide to compilation, local packaging, and deployment
│   └── api_spec.yaml               # OpenAPI specifications for Swagger UI
│
├── engine/                         # Computer Vision & Machine Learning Pipeline (Python Engine SDK)
│   ├── core/                       # Low-level computer vision tracking wrappers
│   │   ├── tracker.py              # MediaPipe HandLandmarker initialization and frame feed
│   │   ├── posture.py              # Expandable pose/posture tracking (Body, Eye tracking, XR support)
│   │   └── filter.py               # Signal filters (Kalman, Low-pass filters) for tracking stabilization
│   ├── gesture/                    # Gesture Classification Engine
│   │   ├── classifier.py           # Core classifier orchestrator
│   │   ├── static.py               # Heuristic rules for static poses (Pinch, Fist, Palm)
│   │   └── dynamic.py              # Temporal classification patterns (Swipe, Wave, Scroll gestures)
│   ├── multimodal/                 # Sensor fusion and voice interaction components
│   │   ├── fusion.py               # Multimodal fusion layer (merging speech triggers and gestures)
│   │   ├── voice.py                # Vosk offline voice parsing and keyword classification
│   │   └── speech.py               # Pyttsx3 TTS vocal engine for real-time auditory updates
│   ├── models/                     # Deep learning models & weight binaries
│   │   ├── hand_landmarker.task    # Pre-trained MediaPipe hand landmarker task file
│   │   ├── vosk-model-small/       # Local offline Vosk speech acoustics weights folder
│   │   └── gesture_net.onnx        # Custom ONNX deep learning classification weights
│   ├── os_control/                 # Native operating system automation wrappers
│   │   ├── mouse.py                # PyAutoGUI/PyDirectInput mouse controller (movement, click, drag)
│   │   └── keyboard.py             # OS keyboard event synthesizers
│   ├── utils/                      # Internal engine tools
│   │   ├── logger.py               # High-speed thread-safe log writer
│   │   └── telemetry.py            # Latency monitors, FPS tracking, and pipeline performance utilities
│   └── runner.py                   # Main loop entry point (captures frames, executes tracker, communicates via WS)
│
├── frontend/                       # React Single Page Application (Vite / TypeScript / Tailwind CSS)
│   ├── public/                     # Static client files (favicons, manifests, offline sw.js)
│   ├── src/                        # React client source files
│   │   ├── assets/                 # Web application graphics and styling definitions
│   │   ├── components/             # Reusable UI React components
│   │   │   ├── common/             # Generic elements (Buttons, Tooltips, Status Badges)
│   │   │   ├── dashboard/          # Performance UI panels (RealTimeAnalytics, SystemTelemetry)
│   │   │   └── gesture/            # Panels for viewing gesture maps and active state logs
│   │   ├── context/                # Global React State Contexts
│   │   │   ├── AiStreamContext.tsx # Manages WebSocket data flow, telemetry state, and diagnostics
│   │   │   └── AuthContext.tsx     # Handles session control and user profile states
│   │   ├── hooks/                  # Custom state hooks
│   │   │   └── useAiStream.ts      # Accessor hook for AI streaming telemetry
│   │   ├── pages/                  # Modular view screens
│   │   │   ├── Dashboard.tsx       # Primary operational overview, telemetry, and banner controls
│   │   │   ├── Mappings.tsx        # System shortcut mapping setup interface
│   │   │   └── Auth.tsx            # Optional sign-in / profile registration portal
│   │   ├── styles/                 # Custom styling configurations (Tailwind utilities, keyframes)
│   │   ├── App.tsx                 # Routing table and core container layout
│   │   └── main.tsx                # React application bootstrapped
│   ├── package.json                # Node modules, build variables, and development commands
│   ├── tailwind.config.js          # Tailwind styling presets and custom HSL palettes
│   ├── tsconfig.json               # TypeScript compiler rules
│   └── vite.config.ts              # Vite bundler parameters
│
├── logs/                           # System logs folder (automatically ignored in Git)
│   ├── backend.log                 # Web server transaction and routing events
│   └── engine.log                  # CV pipeline, tracker, and classification logs
│
├── scripts/                        # Automation & deployment scripts
│   ├── setup.py                    # Automatic Python virtual environment setup & packaging script
│   ├── download_models.sh          # Model pipeline assets downloader (fetches model binaries)
│   └── build_exec.bat              # PyInstaller Windows executable compiler script
│
├── .gitignore                      # Git tracking exclusion list
├── LICENSE                         # Repository open source licensing details
├── README.md                       # Comprehensive quick-start guides, requirements, and hardware specs
└── config.json                     # System-wide configuration presets (fallback settings, network ports)
```
