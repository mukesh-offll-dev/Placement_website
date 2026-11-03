# ðŸŽ“ Placement Management System (College Placement Portal)

A modern, full-stack web platform built for colleges to streamline the student placement process, manage student profiles, handle job notifications, track project submissions, and provide administrative control.

---

## ðŸ“‘ Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Requirements](#2-system-requirements)
3. [Install Git](#3-install-git)
4. [Install Java JDK 21](#4-install-java-jdk-21)
5. [Install Node.js & npm](#5-install-nodejs--npm)
6. [Install & Setup Apache Maven](#6-install--setup-apache-maven)
7. [Clone the Project](#7-clone-the-project)
8. [Open the Project in Your Editor / IDE](#8-open-the-project-in-your-editor--ide)
9. [Frontend Setup & Run (React + Vite)](#9-frontend-setup--run-react--vite)
10. [Backend Setup â€” H2 Development Mode (Zero Database Setup)](#10-backend-setup--h2-development-mode-zero-database-setup)
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
25. [Applications & Interview API](#25-applications--interview-api)
26. [Student Accounts & Management](#26-student-accounts--management)

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
1. Download the official 64-bit Windows installer: ðŸ‘‰ [git-scm.com/download/win](https://git-scm.com/download/win)
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
1. Visit the Eclipse Adoptium download page: ðŸ‘‰ [adoptium.net/temurin/releases/?version=21](https://adoptium.net/temurin/releases/?version=21)
2. Select **Operating System: Windows** and **Architecture: x64**.
3. Choose the **.msi installer** (`OpenJDK21U-jdk_x64_windows_hotspot_...msi`).
4. Run the `.msi` installer.

### Critical Installer Options
During the setup wizard, on the **Custom Setup** screen:
- ðŸŸ¢ Set **"Add to PATH"** to **"Will be installed on local hard drive"**.
- ðŸŸ¢ Set **"Set JAVA_HOME variable"** to **"Will be installed on local hard drive"**.
- ðŸŸ¢ Set **"JavaSoft (Oracle) registry keys"** to **"Will be installed on local hard drive"**.
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
1. Download the LTS version (Long Term Support): ðŸ‘‰ [nodejs.org](https://nodejs.org/)
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

### METHOD A â€” Use the Included Maven Wrapper (Recommended)
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

### METHOD B â€” Manual Maven Installation on Windows

If `.\mvnw.cmd` fails or you prefer a global Maven installation:

1. **Download Maven Binary Zip:**
   - Go to ðŸ‘‰ [maven.apache.org/download.cgi](https://maven.apache.org/download.cgi)
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
   You should see `frontend`, `backend`, `render.yaml`, `docker-compose.yml`, and `README.md`.

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

### Step 1: Open Terminal in the `frontend` folder
The frontend lives in `frontend/` and the backend in `backend/`; each has its own tooling.
```powershell
cd Placement_website\frontend
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

  âžœ  Local:   http://localhost:5173/
  âžœ  Network: use --host to expose
  âžœ  press h + enter to show help
```

### Step 4: Open in Browser
Open your browser and navigate to: ðŸ‘‰ **`http://localhost:5173`**

### Step 5: How to Stop the Frontend
Press `Ctrl + C` in the terminal and type `y` to terminate.

---

## 10. Backend Setup â€” H2 Development Mode (Zero Database Setup)

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
ðŸ‘‰ **`http://localhost:8080/api/health`**

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
ðŸ‘‰ **`http://localhost:8080/api/h2-console`**

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
1. Go to ðŸ‘‰ [neon.tech](https://neon.tech/) and sign up for a free account.
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

The backend uses `backend/src/main/resources/application-prod.properties`, which reads the database settings from environment variables:

| Environment Variable | Description | Example Format |
| :--- | :--- | :--- |
| `DB_URL` | PostgreSQL JDBC Connection URL with SSL enabled | `jdbc:postgresql://<your-neon-host>/neondb?sslmode=require` |
| `DB_USERNAME` | Neon PostgreSQL username | `<your-neon-username>` |
| `DB_PASSWORD` | Neon PostgreSQL password | `<your-neon-password>` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `prod` |

### Configure the Backend `.env` File (Recommended)
The backend includes a dotenv loader. From the project root, copy the backend template and edit it with the connection details shown in your Neon dashboard:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set `SPRING_PROFILES_ACTIVE=prod`, and replace `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` with your own values. `DB_URL` must be the JDBC form `jdbc:postgresql://<your-neon-host>/neondb?sslmode=require`. Keep the `.env` file private; it is ignored by Git.

Then start the backend from its folder:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### Alternatively: Set Environment Variables in PowerShell
```powershell
$env:DB_URL="jdbc:postgresql://<your-neon-host>/neondb?sslmode=require"
$env:DB_USERNAME="<your-neon-username>"
$env:DB_PASSWORD="<your-neon-password>"
$env:SPRING_PROFILES_ACTIVE="prod"
.\mvnw.cmd spring-boot:run
```

> [!IMPORTANT]
> **The `.env.example` file is only a template; it is not loaded automatically.** Copy it to `.env` as shown above. The backend reads `.env` files, and operating-system environment variables take precedence over values in the file. The default `dev` profile uses in-memory H2; use `prod` to require PostgreSQL settings.

### Email notifications with EmailJS

All email is sent by the backend through [EmailJS](https://www.emailjs.com/) (REST API). There is no SMTP and nothing is sent from the browser, so the frontend needs no EmailJS settings.

| When | Who gets the email |
|---|---|
| A student submits an application, or its status changes | The student |
| A job is posted | Eligible students |
| Admin-triggered notifications, profile reminders | The recipients |

**Setup** (`backend/.env`)

1. In the EmailJS dashboard, create an email service and a template. The template must use `{{to_email}}`, `{{to_name}}`, `{{subject}}`, `{{message}}`, and its **To Email** field must be `{{to_email}}`.
2. In **Account > Security**, tick "Allow EmailJS API for non-browser applications" and "Use Private Key".
3. Set `APP_MAIL_ENABLED=true`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` and `EMAILJS_PRIVATE_KEY` (Account > API keys). Leave `APP_MAIL_ENABLED=false` to send no email; in-app notifications are unaffected.
4. Restart the backend. Failures are logged as warnings and never block the action that triggered them.

Code: `EmailJsMailer`, used by `NotificationDispatcher` and `JobNotificationService`. Tests: `mvnw test` (the mailer is mocked, so nothing is sent).

---

## 14b. Deploy: Render (backend) + Vercel (frontend) + Neon (database)

**1. Backend on Render.** Render > New > Blueprint > pick this repo. `render.yaml` creates a Docker web service in Singapore (same region as Neon) and a health check on `/api/actuator/health`. Fill in the secrets it asks for: `DB_URL` (`jdbc:postgresql://<neon-host>/neondb?sslmode=require`), `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` (32+ random characters), `EMAILJS_*`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `CLOUDINARY_URL` (uploads are stored in Cloudinary, see below), and leave `APP_FRONTEND_URL` for step 3. The plan is `starter` on purpose: the free plan sleeps after about 15 minutes idle (the first request then takes up to a minute, and the daily reminder job does not run) and has too little RAM for Spring Boot.

**2. Frontend on Vercel.** Import the repo and set **Root Directory** to `frontend` (Framework: Vite; `frontend/vercel.json` sets the build and the single-page-app rewrite). No environment variables are needed: the app calls `/api`, and `vercel.json` forwards `/api/*` to the Render backend, so the browser only talks to the Vercel domain (same origin, no CORS). **If your Render URL is not `placement-cell-api-bj9i.onrender.com`, change the URL in the first rewrite of `frontend/vercel.json`** (`https://<your-render-service>.onrender.com/api/:path*`). Deploy.

**3. Connect them.** In Render set `APP_FRONTEND_URL` to the Vercel URL (no trailing slash; used for links in emails) and redeploy. There is no CORS setting and no port setting: Render supplies `PORT` itself, and the API always lives under `/api`. (`APP_CORS_ALLOWED_ORIGINS` exists only for the rare case of a browser calling the backend directly from another origin.)

**4. Check.** Open `https://<render-service>.onrender.com/api/actuator/health` (should be `UP`), then sign in at the Vercel URL as the admin from `DEFAULT_ADMIN_*`. On a fresh database the admin is created at first start; change that password straight away.

**File storage (Cloudinary).** With `FILE_STORAGE=cloudinary` (set in `render.yaml`) resumes and project media are uploaded to Cloudinary as private files; nothing is kept on the server disk, so redeploys lose nothing. Browsers never get a Cloudinary link: downloads go through the backend (`/files/...` and the resume/project endpoints), which checks the login and then fetches the file with a signed URL. Set `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>` (Cloudinary console > Settings > API Keys). In Cloudinary > Settings > Security, tick **Allow delivery of PDF and ZIP files**. The free plan limits file size (about 10 MB). For local development leave `FILE_STORAGE=local`. Code: `CloudinaryFileStorageService` (the local one is `FileStorageServiceImpl`).

Notes: use a new `JWT_SECRET` and database password for production (never the ones used in development). `APP_DATA_INIT_ENABLED` stays `false` so no demo data is created. Every push to `main` redeploys both services.

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
ðŸ‘‰ **`http://localhost:8080/api/actuator/health`**

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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ TERMINAL 1: Frontend (React + Vite)                    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ cd Placement_website                                   â”‚
â”‚ npm install                                            â”‚
â”‚ npm run dev                                            â”‚
â”‚                                                        â”‚
â”‚ âžœ App running at: http://localhost:5173                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ TERMINAL 2: Backend (Spring Boot)                      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ cd Placement_website\backend                           â”‚
â”‚ .\mvnw.cmd spring-boot:run                             â”‚
â”‚ (or: mvn spring-boot:run)                              â”‚
â”‚                                                        â”‚
â”‚ âžœ API running at: http://localhost:8080/api            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### URLs to Open:
1. ðŸŒ **Frontend Application:** [http://localhost:5173](http://localhost:5173)
2. ðŸ”Œ **Backend Health API:** [http://localhost:8080/api/health](http://localhost:8080/api/health)
3. ðŸ—„ï¸ **H2 Web Database Console (Dev):** [http://localhost:8080/api/h2-console](http://localhost:8080/api/h2-console)

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
frontend/                       # React + Vite frontend (deployed on Vercel; Root Directory = frontend)
    package.json, vite.config.js, vercel.json, Dockerfile, nginx.conf, public/, src/   (React source under src/)
â”‚   â”œâ”€â”€ assets/                   # CSS and graphic assets
â”‚   â”œâ”€â”€ components/               # Reusable UI components (Navbar, Cards, Modals)
â”‚   â”œâ”€â”€ context/AuthContext.jsx   # Global authenticated session, token, and role
â”‚   â”œâ”€â”€ layouts/                  # Layout wrappers (AdminLayout, StudentLayout)
â”‚   â”œâ”€â”€ pages/                    # React page views
â”‚   â”‚   â”œâ”€â”€ LandingPage.jsx       # Public landing page
â”‚   â”‚   â”œâ”€â”€ LoginPage.jsx         # Authentication view
â”‚   â”‚   â”œâ”€â”€ StudentDashboard.jsx  # Student portal
â”‚   â”‚   â”œâ”€â”€ AdminDashboard.jsx    # Placement officer portal
â”‚   â”‚   â”œâ”€â”€ NotificationPage.jsx  # Placement notices & announcements
â”‚   â”‚   â”œâ”€â”€ StudentProfile.jsx    # Student profile management
â”‚   â”‚   â””â”€â”€ AddProjectPage.jsx    # Student project showcase submission
â”‚   â”œâ”€â”€ App.jsx                   # React Router v7 route declarations
â”‚   â”œâ”€â”€ main.jsx                  # React application bootstrap
â”‚   â””â”€â”€ index.css                 # Tailwind CSS v4 styling rules
â”‚
â”œâ”€â”€ backend/                      # Spring Boot Java Backend Source Code
â”‚   â”œâ”€â”€ .mvn/wrapper/             # Maven wrapper binary & config
â”‚   â”œâ”€â”€ mvnw / mvnw.cmd           # Maven wrapper CLI scripts
â”‚   â”œâ”€â”€ pom.xml                   # Maven project dependencies & build configuration
â”‚   â”œâ”€â”€ .env.example              # Template environment variables (Safe for git)
â”‚   â”œâ”€â”€ src/main/java/com/gces/placementcell/
â”‚   â”‚   â”œâ”€â”€ PlacementCellApplication.java  # Spring Boot Main Entrypoint
â”‚   â”‚   â”œâ”€â”€ config/               # SecurityConfig, CorsConfig
â”‚   â”‚   â”œâ”€â”€ controller/           # REST Controllers (HealthController)
â”‚   â”‚   â”œâ”€â”€ dto/                  # ApiResponse, request/response models
â”‚   â”‚   â”œâ”€â”€ entity/               # JPA Database Entities
â”‚   â”‚   â”œâ”€â”€ repository/           # Spring Data JPA Repository interfaces
â”‚   â”‚   â”œâ”€â”€ service/              # Service Layer business logic interfaces
â”‚   â”‚   â””â”€â”€ exception/            # GlobalExceptionHandler, Custom exceptions
â”‚   â””â”€â”€ src/main/resources/
â”‚       â”œâ”€â”€ application.yml       # Base Spring Boot properties (port 8080, context-path /api)
â”‚       â”œâ”€â”€ application-dev.yml   # Dev profile: H2 in-memory configuration
â”‚       â””â”€â”€ application-prod.yml  # Prod profile: PostgreSQL & HikariCP pool configuration
â”‚
â”œâ”€â”€ .gitignore                    # Prevents .env, node_modules, and target/ from being committed
render.yaml / docker-compose.yml   # Render blueprint (backend) and local Docker Compose
schema/                        # SQL migrations
â””â”€â”€ README.md                     # Complete project documentation
```

The frontend wraps the application in `AuthProvider`. Components can use `useAuth()` to access
the current `session`, `token`, `user`, and `role`, or call the shared `login`, `applyAuthData`,
and `logout` actions. (Students no longer register themselves; see
[section 26](#26-student-accounts--management).) Protected routes and portal navigation use this same state; the session is
restored from browser storage after reload and cleared when the token expires or an API request
returns an unauthorized response.

---

## 22. Quick Start (For Experienced Developers)

```bash
# Clone
git clone https://github.com/mukesh-offll-dev/Placement_website.git
cd Placement_website

# Terminal 1: Frontend
cd frontend && npm install && npm run dev
# âžœ http://localhost:5173

# Terminal 2: Backend (Dev Mode - H2)
cd backend && mvn spring-boot:run
# âžœ http://localhost:8080/api/health
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

---

## 25. Applications & Interview API

Every route below uses the `/api` base path and requires a JWT bearer token. Student routes require the `STUDENT` role; application-review routes require the `ADMIN` role. Successful responses use the standard `ApiResponse` envelope.

### Student application routes

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `POST` | `/student/applications` | Apply to an open job |
| `GET` | `/student/applications?page=0&size=20` | List the authenticated student's applications |
| `GET` | `/student/applications/{id}` | Get an application and its ordered status/interview timeline |
| `PATCH` | `/student/applications/{id}/withdraw` | Withdraw an application that is not already closed |

Submit an application with a required affirmative consent:

```json
{
  "jobId": 42,
  "coverLetter": "I am interested in this role because...",
  "resumeUrl": "https://example.com/resume.pdf",
  "consentGiven": true
}
```

The student identity comes from the authenticated token. A resume URL may be omitted to use the resume on the student's profile. Applying to a closed/expired job or applying twice returns an error.

### Admin application and interview routes

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `GET` | `/admin/applications?jobId=42&status=APPLIED&page=0&size=20` | List/filter applications |
| `GET` | `/admin/applications/{id}` | Get application details and timeline |
| `PATCH` | `/admin/applications/{id}/status` | Change status and optionally record a stage/round |
| `POST` | `/admin/applications/{id}/timeline` | Add an interview or selection stage |

Change a status using one of `APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `REJECTED`, or `SELECTED`:

```json
{
  "status": "SHORTLISTED",
  "currentStage": "Technical Interview",
  "currentRoundId": 7,
  "remarks": "Proceed to technical interview"
}
```

Add a stage with a `TimelineStatus` of `DONE`, `UPCOMING`, `PENDING`, `FAILED`, or `SKIPPED`:

```json
{
  "stageLabel": "Technical Interview",
  "stageDate": "2026-10-20",
  "status": "UPCOMING",
  "remarks": "Online interview"
}
```

Stages are appended in display order, and the current application stage is updated. A selection round supplied during a status change must belong to the same job. Only the student can withdraw their own application.


---

## 26. Student Accounts & Management

Students do **not** register themselves. The placement cell creates every student account, and the
student finishes setting it up the first time they sign in.

### The workflow

1. **Admin adds students.** Admin â†’ Students â†’ **Manage Students**.
   - *Add a student*: Register Number, Department, Year.
   - *Add many students*: Register Number **From** / **To**, Department, Year. The range is generated
     for you (for example `811521104001` to `811521104060`) and any register number that already
     exists is skipped. A range must share its prefix and digit length, run forwards, and be at most
     100 numbers per request.
   - **Year of passing** is the year the batch graduates (2026 means batch 2022-2026).
   - **Department** is chosen by its code (CSE, ECE, EEE, CIVIL, MECH, MCT, and any you add). See *Departments* below.
2. **Student signs in** at `/student/login` with their **Register Number** and **Password**. The
   initial password is the register number (case does not matter for this first sign-in).
3. **First login is a forced setup.** The student is sent to `/student/setup` and cannot use anything
   else until they set a **new password** and give their **name, email and phone**. The server
   enforces this too: until setup is done every API call except setup, `/auth/me` and logout is refused.
4. They land on the **Student Dashboard** and complete the rest (CGPA, skills, resume, projects) later.
5. **Reminder.** A daily job (10:00) emails and notifies students who finished setup but whose profile
   is still incomplete, at most once a week each. Admins can also press **Remind incomplete profiles**.

### What admins can do (Manage Students)

| Action | Effect |
|---|---|
| Add / Add many | Creates the account; the register number is the first password. |
| Search and filter | By register number, name, email, department; All / Active / Deactivated / Setup pending. |
| Edit | Name, email, department, year, CGPA, total and active backlogs, skills, placement status, placed company, package. Validated in the form and again on the server. |
| Deactivate / Reactivate | Blocks or restores sign-in; ends any active session at once. Data is kept. |
| Reset password | Sets the password back to the register number and forces a change at next login. |
| Delete | Removes the student from lists and blocks sign-in. Applications are kept and the register number stays reserved. Asks you to type the register number to confirm. |

### Departments

Departments are data, not code, so a new department never needs a release. In **Manage Students → Departments**:

| Action | Effect |
|---|---|
| Add department | A short unique **code** (2 to 10 letters or digits, saved in capitals, for example `AIDS`) and a **name**. It appears in every student form and filter at once. |
| Rename | Changes the name. The **code is fixed**, because students and job drives refer to it. |
| Deactivate / Activate | A deactivated department cannot be chosen for new students; students already in it stay in it. |
| Delete | Only while no student or job drive uses it. Otherwise deactivate it. |

The starting set is CSE, ECE, EEE, CIVIL, MECH and MCT (added on the first start of an empty database). Any
department code that students already carry (for example `IT`) gets a row automatically, so existing students stay valid.
API: `GET/POST /api/admin/departments`, `PUT/DELETE /api/admin/departments/{id}`.

### Security rules

- All permissions are enforced on the backend (`/admin/**` needs ADMIN or PLACEMENT_OFFICER; `/student/**` needs STUDENT).
- Passwords are stored as bcrypt hashes and never appear in a response or log. New passwords need 8+
  characters with upper case, lower case and a digit, and cannot be the register number.
- Register numbers must be **exactly 12 digits** (for example `830123104032`), enforced when an admin
  adds, bulk-adds or changes one (`StudentIdentity`, and the Manage Students forms accept digits only).
  Numbers created before this rule (such as `DEMO0001`) keep working and can be edited without
  changing their number; no database constraint was added, so existing rows are untouched.
  They are stored trimmed with a database `UNIQUE` constraint plus an uppercase `CHECK`.
- Students cannot sign in with an email, only with a register number. Deactivated and deleted students cannot sign in.
- Because the first password is guessable, **5 wrong passwords lock that account for 15 minutes**
  (`APP_LOGIN_MAX_FAILURES`, `APP_LOGIN_LOCKOUT_MINUTES`). An admin password reset lifts the lock.
- Until a student sets a real email, an internal stand-in address (`...@pending.gces.local`) is used.
  It is never shown and never emailed.

### Database migration

The change is applied automatically at startup (`backend/src/main/resources/schema.sql`, *In-place
migrations*) and mirrored in `schema/05_student_management_migration.sql`. It adds
`users.must_change_password`, `student_profiles.profile_setup_completed` and
`student_profiles.profile_reminder_sent_at`, uppercases existing register numbers, and adds the
uppercase `CHECK`. It is safe to run repeatedly. Existing students count as already set up and keep
their current passwords; they now sign in with their register number. A student with **no** register
number cannot sign in until an admin edits one in.

Before running it by hand on a database with existing students, check for register numbers that differ
only by case:

```sql
SELECT UPPER(TRIM(roll_no)), COUNT(*) FROM student_profiles
WHERE roll_no IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;
```

### API

| Method and path | Who | Purpose |
|---|---|---|
| `POST /api/auth/login` | public | `{ registerNumber, password }` for students, `{ email, password }` for staff. |
| `POST /api/student/account/setup` | student | First-login setup. Returns a fresh token. |
| `POST /api/student/account/change-password` | student | Change password (needs the current one). |
| `POST /api/admin/students/provision` | admin | Add one student. |
| `POST /api/admin/students/provision/bulk` | admin | Add a register number range. |
| `PUT /api/admin/students/{id}` | admin | Edit a profile. |
| `PATCH /api/admin/students/{id}/deactivate` and `/reactivate` | admin | Block or restore sign-in. |
| `POST /api/admin/students/{id}/reset-password` | admin | Back to the register number. |
| `DELETE /api/admin/students/{id}` | admin | Delete (soft). |
| `POST /api/admin/students/profile-reminders` | admin | Send the incomplete-profile reminders now. |

`POST /api/auth/register/student` no longer exists.

### Configuration (all optional, in `backend/.env`)

```env
APP_LOGIN_MAX_FAILURES=5               # wrong passwords before a lockout
APP_LOGIN_LOCKOUT_MINUTES=15
APP_PROFILE_REMINDER_ENABLED=true      # daily incomplete-profile reminder
APP_PROFILE_REMINDER_INTERVAL_DAYS=7   # at most one reminder per student per interval
APP_PROFILE_REMINDER_CRON=0 0 10 * * * # when it runs
```

Reminder emails use the same mail settings as job alerts (`APP_MAIL_ENABLED`, `EMAILJS_*`). With mail off, the in-app notification is still created.

### Testing it

```powershell
cd backend ; .\mvnw.cmd test      # includes StudentManagementFlowTest (end to end through the real security chain)
cd ..\frontend ; npm test ; npm run lint
```

`StudentManagementFlowTest` covers single and bulk creation (including duplicates and bad ranges), the
first-login lock, setup, profile editing, deactivate, reactivate, password reset, delete, the login
throttle, and refusal of anonymous and student callers on every admin endpoint.
