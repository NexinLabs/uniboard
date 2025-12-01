# Uniboard

Uniboard is a professional-grade, real-time collaborative whiteboard application designed for teams and individuals to brainstorm, plan, and create together. Built with the MERN stack (MongoDB, Express, React, Node.js) and powered by Socket.IO for instant updates.

## 🚀 Features

### Core Whiteboard
*   **Shapes:** Draw Rectangles, Circles, and more.
*   **Connectors:** Smart arrows (Straight, Elbow) to connect elements.
*   **Text:** Add text anywhere or double-click shapes to add labels.
*   **Images:** Paste images directly from your clipboard (Ctrl+V).
*   **Icons:** Integrated emoji icon library.
*   **Manipulation:** Select, Move, Resize, and Delete elements.
*   **Navigation:** Pan and Zoom canvas controls.

### Collaboration & Real-time
*   **Live Updates:** See changes from other users instantly via Socket.IO.
*   **Multi-user Support:** Collaborate on the same board simultaneously.
*   **Cursor Tracking:** (Optional/Planned) See other users' cursors.

### Dashboard & Management
*   **User Authentication:** Secure Signup and Login.
*   **Board Management:** Create, Delete, and Search for boards.
*   **Templates:** Start with blank canvases or predefined templates (Flowchart, Mind Map, etc.).
*   **Modern UI:** Sleek, responsive design with dark/light mode aesthetics.

## 🛠️ Tech Stack

### Frontend
*   **React** (Vite)
*   **TypeScript**
*   **Tailwind CSS** (Styling)
*   **Framer Motion** (Animations)
*   **Socket.IO Client** (Real-time communication)
*   **Lucide React** (Icons)
*   **React Router DOM** (Routing)

### Backend
*   **Node.js** & **Express**
*   **MongoDB** & **Mongoose** (Database)
*   **Socket.IO** (Real-time server)
*   **JWT** (JSON Web Tokens for Authentication)
*   **Bcryptjs** (Password hashing)

## 📦 Installation

### Prerequisites
*   Node.js (v14+ recommended)
*   MongoDB (Local instance or Atlas URI)
*   Yarn or npm

### 1. Clone the Repository
```bash
git clone https://github.com/hunter87ff/uniboard.git
cd uniboard
```

### 2. Backend Setup
Navigate to the server directory and install dependencies:
```bash
cd server
yarn install  # or npm install
```

Create a `.env` file in the `server` directory with the following variables:
```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/uniboard
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=1d
```

Start the backend server:
```bash
yarn dev      # or npm run dev
```

### 3. Frontend Setup
Open a new terminal, navigate to the client directory, and install dependencies:
```bash
cd client
yarn install  # or npm install
```

Start the frontend development server:
```bash
yarn dev      # or npm run dev
```

## 🖥️ Usage

1.  Ensure both backend (`port 5000`) and frontend (`port 5173`) servers are running.
2.  Open your browser and navigate to `http://localhost:5173`.
3.  **Sign Up** for a new account.
4.  **Create a Board** from the dashboard.
5.  Start drawing and collaborating!

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **V** | Select Tool |
| **H** | Pan Tool |
| **R** | Rectangle Tool |
| **C** | Circle Tool |
| **L** | Arrow/Line Tool |
| **T** | Text Tool |
| **Space** | Hold to Pan |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |
| **Ctrl+C/V** | Copy / Paste |
| **Del** | Delete Selected |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).