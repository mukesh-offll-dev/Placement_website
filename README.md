# 🎓 Placement Management System (College Placement Portal)

A modern, full-featured web platform built for colleges to streamline the student placement process, manage student profiles, handle job notifications, track project submissions, and provide administrative control.

---

## 🛠️ Tech Stack

- **Frontend Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.x or higher recommended) - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/)

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally on your machine:

### 1. Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/mukesh-offll-dev/Placement_website.git
cd Placement_website
```

*(If your cloned directory name differs, simply navigate to the cloned project folder).*

---

### 2. Install Dependencies

Install all necessary packages using `npm`:

```bash
npm install
```

---

### 3. Run the Development Server

Start the local development server:

```bash
npm run dev
```

Once started, open your browser and visit:
👉 **`http://localhost:5173`** (or the URL displayed in your terminal).

---

### 4. Build for Production (Optional)

To create an optimized production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 📤 How to Push Code Changes to GitHub

Whenever you make changes or add new features, follow these standard Git commands:

### Standard Push Workflow (Main Branch)

1. **Check modified files:**
   ```bash
   git status
   ```

2. **Stage your changes:**
   ```bash
   git add .
   ```

3. **Commit your changes with a descriptive message:**
   ```bash
   git commit -m "feat: describe the changes you made"
   ```

4. **Pull latest changes (recommended to prevent conflicts):**
   ```bash
   git pull origin main
   ```

5. **Push your code to GitHub:**
   ```bash
   git push origin main
   ```

---

### 🌿 Feature Branch Workflow (Recommended for Teams)

If you are collaborating with multiple team members:

1. **Create and switch to a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes, stage, and commit:**
   ```bash
   git add .
   git commit -m "feat: add feature details"
   ```

3. **Push the branch to GitHub:**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Create a Pull Request (PR)** on GitHub to merge into `main`.

---

## 📁 Project Structure

```text
Placement_website/
├── public/              # Static assets (images, icons, etc.)
├── src/
│   ├── assets/          # Project assets & styles
│   ├── components/      # Reusable UI components & navigation bars
│   ├── layouts/         # Layout wrappers (AdminLayout, StudentLayout)
│   ├── pages/           # Application views/pages
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── NotificationPage.jsx
│   │   ├── StudentProfile.jsx
│   │   └── AddProjectPage.jsx
│   ├── App.jsx          # App routing and layout configurations
│   ├── main.jsx         # Application entry point
│   └── index.css        # Tailwind CSS imports & global styles
├── package.json         # Project metadata & scripts
├── vite.config.js       # Vite configuration
└── README.md            # Project documentation
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
