# 🎓 Placement Management System (College Placement Portal)

A modern, full-stack web platform built for colleges to streamline the student placement process, manage student profiles, handle job notifications, track project submissions, and provide administrative control.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Port:** `5173` (Default)

### Backend
- **Framework:** [Spring Boot 3.3.5](https://spring.io/projects/spring-boot) (Java 21)
- **Data Persistence:** Spring Data JPA / Hibernate
- **Databases Supported:**
  - **Dev Profile:** H2 In-Memory Database (zero setup needed)
  - **Prod Profile:** PostgreSQL / [Neon PostgreSQL Serverless](https://neon.tech/)
- **Security:** Spring Security + BCrypt
- **Monitoring:** Spring Boot Actuator
- **Build Tool:** Apache Maven 3.9+ (includes Maven Wrapper `mvnw`)
- **Port & Context Path:** `http://localhost:8080/api`

---

## 📋 Prerequisites (What to Install First)

Before running the project locally, install the following tools:

| Tool | Recommended Version | Download Link | Verification Command |
| :--- | :--- | :--- | :--- |
| **Java JDK** | **Java 21** (LTS) | [Eclipse Adoptium Temurin 21](https://adoptium.net/temurin/releases/?version=21) | `java -version` |
| **Node.js & npm** | **Node 18.x or 20.x** | [Node.js Official Site](https://nodejs.org/) | `node -v` and `npm -v` |
| **Git** | Latest | [Git Official Site](https://git-scm.com/) | `git --version` |
| **Maven** *(Optional)* | 3.9+ | [Apache Maven](https://maven.apache.org/download.cgi) *(Wrapper included)* | `mvn -version` |

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone the Repository

Open your terminal (PowerShell, Command Prompt, or Bash) and clone the repository:

```bash
git clone https://github.com/mukesh-offll-dev/Placement_website.git
cd Placement_website
```

---

### 2. Frontend Setup & Run

Open a terminal in the root folder (`Placement_website`):

```bash
# 1. Install frontend dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

🌐 Open your browser and visit: **`http://localhost:5173`**

---

### 3. Backend Setup & Run

Open a **new separate terminal** and navigate to the `backend` directory:

```bash
cd Placement_website/backend
```

You can run the backend in either **Dev Mode** (instant start) or **Production Mode** (connected to Neon PostgreSQL):

#### Option A: Quick Dev Mode (H2 In-Memory Database)
> No database configuration or credentials needed! Starts immediately with in-memory H2.

```bash
# Windows (PowerShell or CMD)
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run

# Or if you have Maven installed globally:
mvn spring-boot:run
```

- **API Health:** `http://localhost:8080/api/health`
- **H2 Web Console:** `http://localhost:8080/api/h2-console`
  - JDBC URL: `jdbc:h2:mem:placementcell_dev`
  - Username: `sa`
  - Password: *(leave blank)*

---

#### Option B: Production Mode (Neon PostgreSQL Database)
> Connects to Neon Cloud PostgreSQL via environment variables.

1. **Create your `.env` file from the template:**
   ```bash
   # Copy example template
   cp .env.example .env
   ```

2. **Configure `.env` with your Neon PostgreSQL credentials:**
   ```env
   DB_URL=jdbc:postgresql://<your-neon-host>/neondb?sslmode=require
   DB_USERNAME=neondb_owner
   DB_PASSWORD=your_neon_password
   SPRING_PROFILES_ACTIVE=prod
   ```

3. **Run with environment variables:**

   **In PowerShell (Windows):**
   ```powershell
   $env:DB_URL="jdbc:postgresql://<your-neon-host>/neondb?sslmode=require"
   $env:DB_USERNAME="neondb_owner"
   $env:DB_PASSWORD="your_neon_password"
   $env:SPRING_PROFILES_ACTIVE="prod"
   
   mvn spring-boot:run
   ```

   **In Bash / macOS / Linux:**
   ```bash
   export DB_URL="jdbc:postgresql://<your-neon-host>/neondb?sslmode=require"
   export DB_USERNAME="neondb_owner"
   export DB_PASSWORD="your_neon_password"
   export SPRING_PROFILES_ACTIVE="prod"
   
   ./mvnw spring-boot:run
   ```

---

## 🔍 How to Verify Everything is Working

Once both servers are running:

| Check | URL / Command | Expected Output |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:5173` | Landing page renders properly |
| **Backend Health** | `http://localhost:8080/api/health` | `{"success": true, "data": {"status": "UP"}}` |
| **Actuator DB Health** | `http://localhost:8080/api/actuator/health` | `{"status": "UP", "components": {"db": {"status": "UP"}}}` |

---

## 📁 Project Structure

```text
Placement_website/
├── public/                       # Static assets (images, icons, etc.)
├── src/                          # React Frontend
│   ├── assets/                   # Styles & assets
│   ├── components/               # UI components & navigation
│   ├── layouts/                  # Admin & Student layout wrappers
│   ├── pages/                    # React page views
│   ├── App.jsx                   # Router configuration
│   ├── main.jsx                  # React entry point
│   └── index.css                 # Tailwind CSS styles
│
├── backend/                      # Spring Boot Java Backend
│   ├── .mvn/wrapper/             # Maven wrapper binary & properties
│   ├── mvnw / mvnw.cmd           # Maven wrapper scripts
│   ├── pom.xml                   # Maven dependencies & build config
│   ├── .env.example              # Environment variables template (Safe for Git)
│   ├── src/main/java/com/gces/placementcell/
│   │   ├── PlacementCellApplication.java  # Main Spring Boot Application
│   │   ├── config/               # Security & CORS configuration
│   │   ├── controller/           # REST API Controllers (HealthController, etc.)
│   │   ├── dto/                  # Request & Response DTOs
│   │   ├── entity/               # JPA Entities (to be implemented)
│   │   ├── repository/           # Spring Data JPA Repositories
│   │   ├── service/              # Business Logic Services
│   │   └── exception/            # Custom exceptions & global handler
│   └── src/main/resources/
│       ├── application.yml       # Base configuration
│       ├── application-dev.yml   # H2 in-memory DB configuration
│       └── application-prod.yml  # PostgreSQL production configuration
│
├── .gitignore                    # Root git ignore (protects .env, node_modules)
├── package.json                  # Node.js dependencies & scripts
├── vite.config.js                # Vite build config
└── README.md                     # Project documentation
```

---

## 📤 Git Workflow & Rules

> [!CAUTION]
> **NEVER** commit `.env` or `.env.local` files containing real database passwords to GitHub. Both are already added to `.gitignore`.

### Making & Pushing Changes

```bash
# 1. Check changed files
git status

# 2. Stage changes
git add .

# 3. Commit with a meaningful message
git commit -m "feat: your feature description"

# 4. Pull latest changes
git pull origin main

# 5. Push to GitHub
git push origin main
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
