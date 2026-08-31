# 🎓 Placement Management System (College Placement Portal)

A modern, full-stack web platform built for colleges to streamline the student placement process, manage student profiles, handle job notifications, track project submissions, and provide administrative control.

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Requirements](#2-system-requirements)
3. [Install Git](#3-install-git)
4. [Install Java JDK 21](#4-install-java-jdk-21)
5. [Install Node.js & npm](#5-install-nodejs--npm)
6. [Install & Setup Apache Maven](#6-install--setup-apache-maven)
7. [Clone the Project](#7-clone-the-project)
8. [Open the Project in Your Editor / IDE](#8-open-the-project-in-your-editor--ide)
9. [Frontend Setup & Run (React + Vite)](#9-frontend-setup--run-react--vite)
10. [Backend Setup — H2 Development Mode (Zero Database Setup)](#10-backend-setup--h2-development-mode-zero-database-setup)
11. [Verify Backend Health](#11-verify-backend-health)
12. [Port 8080 Troubleshooting](#12-port-8080-troubleshooting)
13. [Neon Cloud PostgreSQL Setup (Production Profile)](#13-neon-cloud-postgresql-setup-production-profile)
14. [Configuring Environment Variables](#14-configuring-environment-variables)
15. [Verify Production / Neon Connection](#15-verify-production--neon-connection)
16. [Comprehensive Troubleshooting Guide](#16-comprehensive-troubleshooting-guide)
17. [Running Everything Together (Two-Terminal Workflow)](#17-running-everything-together-two-terminal-workflow)
18. [Stopping the Application](#18-stopping-the-application)
19. [Development (H2) vs Production (PostgreSQL)](#19-development-h2-vs-production-postgresql)
20. [Database Safety & Security Rules](#20-database-safety--security-rules)
21. [Project Structure](#21-project-structure)
22. [Quick Start (For Experienced Developers)](#22-quick-start-for-experienced-developers)
23. [First-Time User Setup Checklist](#23-first-time-user-setup-checklist)
24. [Git Workflow & Contributing](#24-git-workflow--contributing)

---

## 1. Project Overview

The **Placement Management System** connects students, placement officers, and campus recruiters in a unified portal.

### Architecture
- **Frontend Client:** React 19 single-page application built with Vite and styled with Tailwind CSS v4.
- **Backend API:** Java 21 REST API built with Spring Boot 3.3.5, Spring Data JPA, and Spring Security.
- **Databases:**
  - **Dev Mode:** In-memory H2 database (zero configuration, instant setup).
  - **Prod Mode:** Cloud-hosted serverless PostgreSQL on [Neon.tech](https://neon.tech/).

### Ports & URL Endpoints
- **Frontend Web UI:** `http://localhost:5173`
- **Backend Server Port:** `8080`
- **Backend API Context Path:** `/api`
- **Full API Base URL:** `http://localhost:8080/api`
- **API Health Endpoint:** `http://localhost:8080/api/health`
- **Actuator Health Endpoint:** `http://localhost:8080/api/actuator/health`
- **H2 Web Console (Dev mode only):** `http://localhost:8080/api/h2-console`

---

## 2. System Requirements

Ensure your machine meets these requirements before starting:

| Requirement | Recommended Version | Details |
| :--- | :--- | :--- |
| **Operating System** | **Windows 10 / 11 (64-bit)** | Also works on macOS & Linux (commands below focus on Windows) |
| **Java Development Kit** | **Java JDK 21 LTS** | Recommended: Eclipse Adoptium Temurin 21 (x64) |
| **Node.js** | **Node.js 18.x or 20.x LTS** | Bundled with `npm` package manager |
| **Git** | **Git 2.40+** | Command-line version control |
| **Build Tool** | **Apache Maven 3.9+** | Repository includes Maven Wrapper (`mvnw.cmd`) |
| **Network** | **Active Internet Connection** | Required for initial `npm install`, Maven dependency downloads, and Neon DB connectivity |

---

## 3. Install Git

Git allows you to clone the project repository and manage versions.

### Installation Steps
1. Download the official 64-bit Windows installer: 👉 [git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the downloaded installer file (e.g. `Git-2.xx.x-64-bit.exe`).
3. Follow the installation wizard (default options are recommended). Ensure **"Git from the command line and also from 3rd-party software"** is selected.
4. Complete the installation and click **Finish**.
5. **Restart your terminal** (PowerShell or Command Prompt).

### Verification
Open a new PowerShell terminal and run:
```powershell
git --version
```

**Expected output:**
```text
git version 2.4x.x.windows.1
```

> [!WARNING]
> **Error: `'git' is not recognized as an internal or external command`**  
> **Solution:** You must restart your terminal after installing. If it still fails, search for `"Edit the system environment variables"` in Windows Start, click **Environment Variables**, find `Path` under *System Variables*, click **Edit**, and add `C:\Program Files\Git\cmd`.

---

## 4. Install Java JDK 21

This Spring Boot backend is compiled with **Java 21**. You must install Java 21 JDK (Java Development Kit), not an older version (like Java 8, 11, or 17) and not just a JRE.

### Recommended Download: Eclipse Temurin JDK 21
1. Visit the Eclipse Adoptium download page: 👉 [adoptium.net/temurin/releases/?version=21](https://adoptium.net/temurin/releases/?version=21)
2. Select **Operating System: Windows** and **Architecture: x64**.
3. Choose the **.msi installer** (`OpenJDK21U-jdk_x64_windows_hotspot_...msi`).
4. Run the `.msi` installer.

### Critical Installer Options
During the setup wizard, on the **Custom Setup** screen:
- 🟢 Set **"Add to PATH"** to **"Will be installed on local hard drive"**.
- 🟢 Set **"Set JAVA_HOME variable"** to **"Will be installed on local hard drive"**.
- 🟢 Set **"JavaSoft (Oracle) registry keys"** to **"Will be installed on local hard drive"**.
- Click **Next** and complete installation.

### Verification
Close all open terminal windows, open a **fresh PowerShell**, and run:
```powershell
java -version
javac -version
```

**Expected output:**
```text
openjdk version "21.0.x" 202x-xx-xx LTS
OpenJDK Runtime Environment Temurin-21.0.x+xx (build 21.0.x+xx)
OpenJDK 64-Bit Server VM Temurin-21.0.x+xx (build 21.0.x+xx, mixed mode, sharing)

javac 21.0.x
```

### Fixing Java PATH and JAVA_HOME Errors
If you see `'java' is not recognized`:
1. Open Windows Search and type **"environment variables"**.
2. Click **"Edit the system environment variables"** -> Click **"Environment Variables..."**.
3. Under **System Variables**:
   - Check if `JAVA_HOME` exists. If not, click **New...**:
     - Variable name: `JAVA_HOME`
     - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-21.0.x.x-hotspot` *(verify your actual folder path in Windows Explorer)*
   - Select `Path` -> Click **Edit...** -> Click **New** -> Add `%JAVA_HOME%\bin`.
4. Click **OK** on all dialogs, close and reopen your terminal.

---

## 5. Install Node.js & npm

Node.js and npm are required to build and run the React frontend.

### Installation Steps
1. Download the LTS version (Long Term Support): 👉 [nodejs.org](https://nodejs.org/)
2. Run the downloaded `.msi` installer (e.g. `node-v20.x.x-x64.msi`).
3. Follow the prompts and accept the license agreement. Ensure **"Add to PATH"** is selected.
4. Click **Install** and then **Finish**.
5. **Restart your terminal**.

### Verification
Open a new PowerShell terminal and verify:
```powershell
node -v
npm -v
```

**Expected output:**
```text
v20.x.x (or v18.x.x)
10.x.x (or 9.x.x)
```

---

## 6. Install & Setup Apache Maven

Maven is used to compile, manage dependencies, and run the Spring Boot backend. You have two ways to run Maven:

### METHOD A — Use the Included Maven Wrapper (Recommended)
This repository includes the Maven Wrapper scripts:
- `backend/mvnw.cmd` (for Windows Command Prompt and PowerShell)
- `backend/mvnw` (for Linux and macOS)

When inside the `backend` directory, you can run:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

> [!NOTE]
> If your network or firewall restricts automatic wrapper downloads from Maven Central, use **Method B** below to install Maven manually.

---

### METHOD B — Manual Maven Installation on Windows

If `.\mvnw.cmd` fails or you prefer a global Maven installation:

1. **Download Maven Binary Zip:**
   - Go to 👉 [maven.apache.org/download.cgi](https://maven.apache.org/download.cgi)
   - Download the Binary zip archive: `apache-maven-3.9.9-bin.zip`.

2. **Extract to `C:\maven`:**
   - Create a folder named `C:\maven`.
   - Extract the downloaded zip so your folder looks like: `C:\maven\apache-maven-3.9.9`.
   - Inside this folder, you should see `bin`, `boot`, `conf`, `lib`.

3. **Set Environment Variables:**
   - Open Windows Search -> **"Edit the system environment variables"** -> **"Environment Variables..."**.
   - Under **System Variables**, click **New...**:
     - Variable name: `MAVEN_HOME`
     - Variable value: `C:\maven\apache-maven-3.9.9`
   - Select `Path` under System Variables -> Click **Edit...** -> Click **New** -> Add:
     `%MAVEN_HOME%\bin`
   - Click **OK** on all windows.

4. **Restart Terminal & Verify:**
   Open a new PowerShell window:
   ```powershell
   mvn -version
   ```

   **Expected output:**
   ```text
   Apache Maven 3.9.9 (8e8579a9e76f7d015ee5ec7bfcdc97d260186937)
   Maven home: C:\maven\apache-maven-3.9.9
   Java version: 21.0.x, vendor: Eclipse Adoptium
   ```

5. **Direct Fallback Command:**
   If `mvn` is still not added to your PATH, you can always execute Maven using its full path:
   ```powershell
   C:\maven\apache-maven-3.9.9\bin\mvn.cmd spring-boot:run
   ```

---

## 7. Clone the Project

1. Open PowerShell and navigate to the directory where you store projects (e.g. `D:\` or `C:\Projects`):
   ```powershell
   cd D:\
   ```

2. Clone the repository from GitHub:
   ```powershell
   git clone https://github.com/mukesh-offll-dev/Placement_website.git
   ```

3. Navigate into the cloned repository:
   ```powershell
   cd Placement_website
   ```

4. Confirm the directory contents:
   ```powershell
   dir
   ```
   You should see `src`, `backend`, `public`, `package.json`, `vite.config.js`, and `README.md`.

---

## 8. Open the Project in Your Editor / IDE

You can use any editor. An IDE is **not mandatory** since all build and run steps can be executed directly in the terminal.

- **Antigravity / VS Code:**
  ```powershell
  code .
  ```
  *(Recommended extensions: Tailwind CSS IntelliSense, Extension Pack for Java, Spring Boot Extension Pack).*
- **IntelliJ IDEA (Optional):**
  Open IntelliJ -> Click **Open** -> Select `Placement_website/backend/pom.xml` -> Choose **Open as Project**.

---

## 9. Frontend Setup & Run (React + Vite)

### Step 1: Open Terminal in Project Root
Make sure your terminal is in `Placement_website`:
```powershell
cd Placement_website
```

### Step 2: Install Node Dependencies
```powershell
npm install
```
*This reads `package.json` and installs React, Tailwind CSS, Lucide Icons, and Vite into `node_modules`.*

### Step 3: Start the Vite Dev Server
```powershell
npm run dev
```

**Expected output:**
```text
  VITE v6.x.x  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 4: Open in Browser
Open your browser and navigate to: 👉 **`http://localhost:5173`**

### Step 5: How to Stop the Frontend
Press `Ctrl + C` in the terminal and type `y` to terminate.

---

## 10. Backend Setup — H2 Development Mode (Zero Database Setup)

The backend comes pre-configured with a **`dev` profile** that uses an in-memory **H2 database**.  
You **do not need** to install PostgreSQL, Docker, or configure passwords to start developing immediately.

### Step 1: Open a Second Terminal
Navigate to the `backend` folder:
```powershell
cd Placement_website\backend
```

### Step 2: Run Spring Boot
Choose one of the following commands based on your setup:

**Option A (Using Maven Wrapper):**
```powershell
.\mvnw.cmd spring-boot:run
```

**Option B (Using Global Maven):**
```powershell
mvn spring-boot:run
```

**Option C (Using Direct Maven Path Fallback):**
```powershell
C:\maven\apache-maven-3.9.9\bin\mvn.cmd spring-boot:run
```

### Expected Startup Output
```text
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/

 :: Spring Boot ::                (v3.3.5)

... INFO ... [placement-cell] : Starting PlacementCellApplication using Java 21.0.x with PID ...
... INFO ... [placement-cell] : The following 1 profile is active: "dev"
... INFO ... [placement-cell] : Tomcat initialized with port 8080 (http)
... INFO ... [placement-cell] : HikariPool-1 - Added connection conn0: url=jdbc:h2:mem:placementcell_dev user=SA
... INFO ... [placement-cell] : Initialized JPA EntityManagerFactory for persistence unit 'default'
... INFO ... [placement-cell] : Tomcat started on port 8080 (http) with context path '/api'
... INFO ... [placement-cell] : Started PlacementCellApplication in 5.4 seconds
```

---

## 11. Verify Backend Health

With the backend running, verify the endpoints:

### 1. API Health Check
Open in your browser or run in PowerShell:
👉 **`http://localhost:8080/api/health`**

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/health" | ConvertTo-Json
```

**Expected JSON response:**
```json
{
  "success": true,
  "message": "Backend is running",
  "data": {
    "service": "Placement Cell API",
    "institution": "GCE Srirangam",
    "status": "UP",
    "timestamp": "2026-08-31T21:22:38.630828"
  }
}
```

### 2. H2 Database Web Console
In dev mode, H2 provides a built-in web management interface at:
👉 **`http://localhost:8080/api/h2-console`**

**Connection Credentials (from `application-dev.yml`):**
- **Saved Settings:** Generic H2 (Embedded)
- **Driver Class:** `org.h2.Driver`
- **JDBC URL:** `jdbc:h2:mem:placementcell_dev`
- **User Name:** `sa`
- **Password:** *(leave empty)*
- Click **Connect** to view in-memory tables.

---

## 12. Port 8080 Troubleshooting

If another process or a previous Spring Boot instance is already running, you will see this error:
```text
APPLICATION FAILED TO START
Description:
Web server failed to start. Port 8080 was already in use.
```

### Step 1: Find the Process ID (PID) using Port 8080
Run this command in PowerShell or Command Prompt:
```powershell
netstat -ano | findstr :8080
```

**Example output:**
```text
  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       19084
```
*In this example, `19084` is the Process ID (PID).*

### Step 2: Identify the Process Before Killing It
Check what application is running on that PID:
```powershell
tasklist | findstr 19084
```
*(If it shows `java.exe`, it is an existing Spring Boot instance).*

### Step 3: Terminate the Conflicting Process
Kill the process using its PID:
```powershell
taskkill /PID 19084 /F
```

Now rerun `mvn spring-boot:run`.

---

## 13. Neon Cloud PostgreSQL Setup (Production Profile)

When deploying or testing persistent data, the project connects to **Neon Serverless PostgreSQL** via the `prod` profile.

### Step 1: Create a Neon Database
1. Go to 👉 [neon.tech](https://neon.tech/) and sign up for a free account.
2. Click **Create Project** (e.g. name it `placement-cell`).
3. Neon will display your project dashboard with connection details.

### Step 2: Get the Connection URI
In the Neon Dashboard under **Connection Details**:
- Select **Postgres / Direct Connection** (or Pooled connection).
- The URI looks like:
  ```text
  postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

---

## 14. Configuring Environment Variables

The backend uses [application-prod.yml](file:///d:/placement/backend/src/main/resources/application-prod.yml) which dynamically reads standard environment variables:

| Environment Variable | Description | Example Format |
| :--- | :--- | :--- |
| `DB_URL` | PostgreSQL JDBC Connection URL with SSL enabled | `jdbc:postgresql://<your-neon-host>/neondb?sslmode=require` |
| `DB_USERNAME` | Neon PostgreSQL username | `neondb_owner` |
| `DB_PASSWORD` | Neon PostgreSQL password | `<your-neon-password>` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `prod` |

### Setting Environment Variables in PowerShell (Session-Based)
Open PowerShell in `Placement_website\backend`:

```powershell
# 1. Set environment variables for the current terminal session
$env:DB_URL="jdbc:postgresql://<your-neon-host>/neondb?sslmode=require"
$env:DB_USERNAME="neondb_owner"
$env:DB_PASSWORD="<your-neon-password>"
$env:SPRING_PROFILES_ACTIVE="prod"

# 2. Start the Spring Boot backend
mvn spring-boot:run
```

### Setting Environment Variables in Command Prompt (CMD)
```cmd
set DB_URL=jdbc:postgresql://<your-neon-host>/neondb?sslmode=require
set DB_USERNAME=neondb_owner
set DB_PASSWORD=<your-neon-password>
set SPRING_PROFILES_ACTIVE=prod
mvn spring-boot:run
```

> [!IMPORTANT]
> **Understanding `.env` vs Environment Variables in Spring Boot:**  
> Standard Spring Boot does not read `.env` files automatically without custom dotenv libraries.  
> The included `.env.example` file serves as a reference template. To run the app, set environment variables directly in your terminal session as shown above, or pass them in your deployment environment (e.g. Render, Railway, AWS).

---

## 15. Verify Production / Neon Connection

When started with `SPRING_PROFILES_ACTIVE=prod`, verify the PostgreSQL connection:

### 1. Check Startup Logs
Look for PostgreSQL driver initialization:
```text
The following 1 profile is active: "prod"
com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Starting...
com.zaxxer.hikari.pool.HikariPool        : HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@...
com.zaxxer.hikari.HikariDataSource       : HikariPool-1 - Start completed.
j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
```

### 2. Actuator Component Health Check
Open in your browser or run:
👉 **`http://localhost:8080/api/actuator/health`**

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/actuator/health" | ConvertTo-Json -Depth 4
```

**Expected JSON output:**
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP"
    },
    "ping": {
      "status": "UP"
    }
  }
}
```
*`"database": "PostgreSQL"` confirms that the live Neon cloud database is connected and active.*

---

## 16. Comprehensive Troubleshooting Guide

| Issue / Error | Cause | Fix / Solution | Verification Command |
| :--- | :--- | :--- | :--- |
| `'java' is not recognized` | Java 21 is not installed or `Path` variable is missing | Install Eclipse Temurin JDK 21 and check "Add to PATH". Restart terminal. | `java -version` |
| `'javac' is not recognized` | JRE installed instead of full JDK, or PATH missing | Install JDK 21 (Temurin x64 `.msi`). Add `%JAVA_HOME%\bin` to PATH. | `javac -version` |
| `JAVA_HOME is not set` | `JAVA_HOME` environment variable missing | Add `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21...` to System Variables. | `echo $env:JAVA_HOME` |
| `'mvn' is not recognized` | Apache Maven is not in system PATH | Use `.\mvnw.cmd` from `backend/` or install Maven to `C:\maven` and add `%MAVEN_HOME%\bin` to PATH. | `mvn -version` |
| `Maven Wrapper download failed` | Network / firewall blocking automatic jar download | Download Apache Maven manually to `C:\maven\apache-maven-3.9.9` and run `mvn spring-boot:run`. | `mvn -version` |
| `Port 8080 was already in use` | Another process is already running on port 8080 | Run `netstat -ano \| findstr :8080` to find PID, then `taskkill /PID <PID> /F`. | `netstat -ano \| findstr :8080` |
| `FATAL: password authentication failed` | Incorrect Neon PostgreSQL username or password | Re-check Neon dashboard credentials. Ensure `$env:DB_PASSWORD` has no typo. | Re-set `$env:DB_PASSWORD` |
| `Connection refused: connect` | Database host is down or incorrect hostname | Check if `$env:DB_URL` contains the correct Neon host (e.g. `ep-xxxx.us-east-2.aws.neon.tech`). | Check `$env:DB_URL` |
| `SSL connection required` | Missing `sslmode=require` query parameter in JDBC URL | Append `?sslmode=require` to your `DB_URL` (e.g. `jdbc:postgresql://<host>/neondb?sslmode=require`). | Check `$env:DB_URL` |
| `Database URL incorrect / missing jdbc: prefix` | Using raw URI `postgresql://` instead of `jdbc:postgresql://` | Format the URL starting with `jdbc:postgresql://`. | Check `$env:DB_URL` |
| `DB_USERNAME / DB_PASSWORD missing` | Environment variables were not set in the active terminal session | Set `$env:DB_USERNAME` and `$env:DB_PASSWORD` in the same terminal before running `mvn`. | `echo $env:DB_USERNAME` |
| `Spring profile not changing to prod` | `$env:SPRING_PROFILES_ACTIVE` not set | Run `$env:SPRING_PROFILES_ACTIVE="prod"` before `mvn spring-boot:run`. | Check startup log for `"profile is active: prod"` |
| `'node' / 'npm' is not recognized` | Node.js not installed or terminal was not restarted | Download Node.js LTS from [nodejs.org](https://nodejs.org/), install, and open a new terminal. | `node -v` |
| `npm install errors / ERESOLVE` | Dependency tree conflict or network timeout | Run `npm install --legacy-peer-deps` or clear cache with `npm cache clean --force`. | `npm install` |
| `CORS Error in Browser Console` | Frontend origin not permitted by backend | [CorsConfig.java](file:///d:/placement/backend/src/main/java/com/gces/placementcell/config/CorsConfig.java) permits `http://localhost:5173` by default. Verify frontend runs on 5173. | Check browser network tab |
| `Frontend cannot connect to backend` | Backend server not running or wrong context path | Ensure backend is started on port 8080 and API calls target `/api/...` prefix. | Test `http://localhost:8080/api/health` |

---

## 17. Running Everything Together (Two-Terminal Workflow)

To run the full stack on your local machine, open **two separate terminal windows**:

```text
┌────────────────────────────────────────────────────────┐
│ TERMINAL 1: Frontend (React + Vite)                    │
├────────────────────────────────────────────────────────┤
│ cd Placement_website                                   │
│ npm install                                            │
│ npm run dev                                            │
│                                                        │
│ ➜ App running at: http://localhost:5173                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ TERMINAL 2: Backend (Spring Boot)                      │
├────────────────────────────────────────────────────────┤
│ cd Placement_website\backend                           │
│ .\mvnw.cmd spring-boot:run                             │
│ (or: mvn spring-boot:run)                              │
│                                                        │
│ ➜ API running at: http://localhost:8080/api            │
└────────────────────────────────────────────────────────┘
```

### URLs to Open:
1. 🌐 **Frontend Application:** [http://localhost:5173](http://localhost:5173)
2. 🔌 **Backend Health API:** [http://localhost:8080/api/health](http://localhost:8080/api/health)
3. 🗄️ **H2 Web Database Console (Dev):** [http://localhost:8080/api/h2-console](http://localhost:8080/api/h2-console)

---

## 18. Stopping the Application

- **Stopping Frontend (Terminal 1):** Press `Ctrl + C` in the terminal -> Type `y` -> Press `Enter`.
- **Stopping Backend (Terminal 2):** Press `Ctrl + C` in the terminal.

### What Happens to Data on Shutdown?
- **In Dev Mode (H2 Database):** H2 runs completely in memory (`jdbc:h2:mem:...`). When you stop the backend, all temporary in-memory tables and records are reset.
- **In Prod Mode (Neon PostgreSQL):** All data is stored in the Neon Cloud database and persists permanently across restarts.

---

## 19. Development (H2) vs Production (PostgreSQL)

| Feature | Development (`dev` profile) | Production (`prod` profile) |
| :--- | :--- | :--- |
| **Database** | In-Memory H2 Database | Neon Cloud PostgreSQL (Serverless) |
| **Setup Needed** | **Zero setup** (Runs instantly) | Neon account + Environment variables |
| **Data Persistence** | Reset on server stop | **Permanent & Persistent** |
| **Hibernate DDL Mode** | `create-drop` (Auto-creates schema) | `validate` (Safe, preserves existing schema/data) |
| **Web Console** | Available at `/api/h2-console` | Managed via Neon Web Dashboard |
| **Use Case** | Local feature building, UI testing | Staging, QA, Production deployment |

---

## 20. Database Safety & Security Rules

> [!CAUTION]
> **Essential Security Rules:**
> 1. **NEVER hardcode passwords** into `application.yml`, `application-prod.yml`, or Java classes.
> 2. **NEVER commit `.env` or `.env.local` files** to GitHub. Both are guarded in `.gitignore`.
> 3. **Never use `ddl-auto: create-drop` in production.** Production uses `validate` to prevent accidental data loss.
> 4. In public repositories, only share `.env.example` containing dummy placeholder values.

---

## 21. Project Structure

```text
Placement_website/
├── public/                       # Static public assets (images, icons)
├── src/                          # React Frontend Source Code
│   ├── assets/                   # CSS and graphic assets
│   ├── components/               # Reusable UI components (Navbar, Cards, Modals)
│   ├── layouts/                  # Layout wrappers (AdminLayout, StudentLayout)
│   ├── pages/                    # React page views
│   │   ├── LandingPage.jsx       # Public landing page
│   │   ├── LoginPage.jsx         # Authentication view
│   │   ├── StudentDashboard.jsx  # Student portal
│   │   ├── AdminDashboard.jsx    # Placement officer portal
│   │   ├── NotificationPage.jsx  # Placement notices & announcements
│   │   ├── StudentProfile.jsx    # Student profile management
│   │   └── AddProjectPage.jsx    # Student project showcase submission
│   ├── App.jsx                   # React Router v7 route declarations
│   ├── main.jsx                  # React application bootstrap
│   └── index.css                 # Tailwind CSS v4 styling rules
│
├── backend/                      # Spring Boot Java Backend Source Code
│   ├── .mvn/wrapper/             # Maven wrapper binary & config
│   ├── mvnw / mvnw.cmd           # Maven wrapper CLI scripts
│   ├── pom.xml                   # Maven project dependencies & build configuration
│   ├── .env.example              # Template environment variables (Safe for git)
│   ├── src/main/java/com/gces/placementcell/
│   │   ├── PlacementCellApplication.java  # Spring Boot Main Entrypoint
│   │   ├── config/               # SecurityConfig, CorsConfig
│   │   ├── controller/           # REST Controllers (HealthController)
│   │   ├── dto/                  # ApiResponse, request/response models
│   │   ├── entity/               # JPA Database Entities
│   │   ├── repository/           # Spring Data JPA Repository interfaces
│   │   ├── service/              # Service Layer business logic interfaces
│   │   └── exception/            # GlobalExceptionHandler, Custom exceptions
│   └── src/main/resources/
│       ├── application.yml       # Base Spring Boot properties (port 8080, context-path /api)
│       ├── application-dev.yml   # Dev profile: H2 in-memory configuration
│       └── application-prod.yml  # Prod profile: PostgreSQL & HikariCP pool configuration
│
├── .gitignore                    # Prevents .env, node_modules, and target/ from being committed
├── package.json                  # Frontend scripts & NPM dependencies
├── vite.config.js                # Vite build and server settings
└── README.md                     # Complete project documentation
```

---

## 22. Quick Start (For Experienced Developers)

```bash
# Clone
git clone https://github.com/mukesh-offll-dev/Placement_website.git
cd Placement_website

# Terminal 1: Frontend
npm install && npm run dev
# ➜ http://localhost:5173

# Terminal 2: Backend (Dev Mode - H2)
cd backend && mvn spring-boot:run
# ➜ http://localhost:8080/api/health
```

---

## 23. First-Time User Setup Checklist

Use this checklist to track your setup:

- [ ] **Git installed** (`git --version` returns version).
- [ ] **Java 21 installed** (`java -version` returns OpenJDK 21).
- [ ] **Node.js & npm installed** (`node -v` returns v18+ or v20+).
- [ ] **Maven available** (`mvn -version` or `backend/mvnw.cmd` functional).
- [ ] **Repository cloned** to your local machine.
- [ ] **Frontend dependencies installed** (`npm install` completed with 0 errors).
- [ ] **Frontend dev server starts** (`npm run dev` opens `http://localhost:5173`).
- [ ] **Backend dev server starts** (`mvn spring-boot:run` in `backend/` folder).
- [ ] **Health endpoint verified** (`http://localhost:8080/api/health` returns `status: UP`).
- [ ] **(Optional) Neon PostgreSQL configured** via environment variables for `prod` profile.
- [ ] **(Optional) PostgreSQL connection verified** at `http://localhost:8080/api/actuator/health`.

---

## 24. Git Workflow & Contributing

### Standard Git Commit & Push Workflow
```powershell
# 1. Check modified files
git status

# 2. Stage your changes
git add .

# 3. Commit with a clear message
git commit -m "feat: add placement drive notification module"

# 4. Pull latest changes
git pull origin main

# 5. Push to GitHub
git push origin main
```

### Contributing via Pull Request
1. Fork the repository on GitHub.
2. Create a feature branch: `git checkout -b feature/NewFeature`.
3. Commit your changes: `git commit -m 'feat: Add NewFeature'`.
4. Push to branch: `git push origin feature/NewFeature`.
5. Open a Pull Request on GitHub.
