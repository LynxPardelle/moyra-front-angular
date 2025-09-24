
# Angular Docker Template 🐳🅰️

A comprehensive, production-ready Docker template for Angular applications with **zero local dependencies**. Create, develop, test, and deploy Angular apps using only Docker and Make - no need to install Node.js, npm, or Angular CLI on your host machine.

## ✨ Features

- 🚀 **Zero Local Dependencies** - Everything runs in Docker containers
- 🔥 **Hot Reload Development** - Real-time code changes with volume mounting
- 🏗️ **Multi-Stage Production Builds** - Optimized SSR and static builds
- 🌐 **Multiple Deployment Options** - SSR with Node.js or static with Nginx
- 📦 **Enhanced Package Management** - Install, update, and manage dependencies in containers
- 🔧 **Comprehensive DevOps** - Health checks, monitoring, debugging, and cleanup tools
- 🎯 **Intelligent Environment Management** - Flexible configuration with .env support
- 🧪 **Testing & Quality Tools** - Built-in testing, linting, and build validation
- 💾 **Backup & Restore** - Project configuration backup and restore capabilities
- 🎨 **Rich CLI Experience** - Colorized output and comprehensive help system

## ✅ Requirements

- **Docker** (20.10+)
- **Make** (available by default in Unix/Linux/macOS; for Windows use WSL, Git Bash, or chocolatey)
- **Git** (optional, for version control)

---

## 🚀 Quick Start

### 1. Create a new Angular app

```bash
make create
```

This command:
- Runs `ng new` inside a Docker container
- Configures the project with SSR, routing, and SCSS by default
- Moves all generated files to the root directory
- Installs dependencies automatically

### 2. Start development server

```bash
make dev
```

Your app will be available at: [http://localhost:6161](http://localhost:6161)

Features:
- 🔥 Hot reload with file watching
- 📁 Volume mounting for instant changes
- 🐛 Source maps for debugging
- 🔧 Angular CLI integration

### 3. Production deployment options

#### Option A: SSR Production Server (Node.js + Express)

```bash
make prod
```

Available at: [http://localhost:6162](http://localhost:6162)

#### Option B: Static Files with Nginx (faster, no SSR)

```bash
make prod-no-ssr
```

Available at: [http://localhost:6163](http://localhost:6163)

---

## 🛠️ Complete Command Reference

### 🎯 Project Setup

| Command | Description |
|---------|-------------|
| `make help` | Show comprehensive help with all commands |
| `make create` | Create new Angular project structure |

### 🚀 Development Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development server with hot-reload |
| `make dev-detached` | Start development server in background |
| `make dev-logs` | Show development container logs |
| `make dev-shell` | Access development container shell |

### 🏗️ Production Commands

| Command | Description |
|---------|-------------|
| `make prod` | Start production server with SSR |
| `make prod-detached` | Start production server with SSR (background) |
| `make prod-no-ssr` | Start production server without SSR (Nginx) |
| `make prod-no-ssr-detached` | Start production without SSR (background) |

### 📦 Package Management

| Command | Description | Example |
|---------|-------------|---------|
| `make install pkg=<name>` | Install runtime package | `make install pkg=axios` |
| `make install-dev pkg=<name>` | Install dev dependency | `make install-dev pkg=jest` |
| `make update` | Update all packages to latest versions | |

### 🔧 Container Management

| Command | Description |
|---------|-------------|
| `make stop` | Stop all running containers |
| `make restart` | Restart containers |
| `make clean` | Clean containers, volumes, and build cache |
| `make rebuild` | Rebuild containers from scratch |
| `make prune` | Remove unused Docker resources |

### 📊 Monitoring & Debugging

| Command | Description |
|---------|-------------|
| `make status` | Show container status and health |
| `make logs` | Show container logs (all services) |
| `make health` | Check container health status |
| `make debug` | Debug compilation errors |
| `make inspect` | Inspect container configuration |

### 🧪 Testing & Quality

| Command | Description |
|---------|-------------|
| `make test` | Run unit tests in container |
| `make lint` | Run linting checks |
| `make build-check` | Check if build completes successfully |

### 💾 Backup & Restore

| Command | Description |
|---------|-------------|
| `make backup` | Backup project data and configuration |
| `make restore` | Restore from backup (interactive) |

---

## 🌱 Environment Configuration

Customize your Angular project by creating a `.env` file in the root directory. Use `.example.env` as a template.

### Key Configuration Options

```bash
# Application Settings
APP_NAME=my-awesome-app                    # Your project name
ANGULAR_CREATE_OPTIONS=--routing --style=scss --ssr --standalone --strict

# Port Configuration  
DEV_PORT=6161                             # Development server port
PROD_PORT=6162                            # Production SSR server port
PROD_NO_SSR_PORT=6163                     # Production static server port

# Build Optimizations
NODE_OPTIONS=--max-old-space-size=4096    # Memory allocation for builds
NG_CLI_ANALYTICS=false                    # Disable Angular telemetry
DOCKER_BUILDKIT=1                         # Enable Docker BuildKit

# User Configuration (for file permissions)
UID=1000                                  # Host user ID
GID=1000                                  # Host group ID
```

### Example `.env` file

```properties
APP_NAME=my-portfolio
NODE_ENV=production
ANGULAR_CREATE_OPTIONS=--routing --style=scss --ssr --standalone --strict

# Ports (change if needed)
DEV_PORT=4200
PROD_PORT=4000  
PROD_NO_SSR_PORT=8080

# Docker optimizations
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Performance settings
NODE_OPTIONS=--max-old-space-size=4096
NG_CLI_ANALYTICS=false
```

---

## 🏗️ Architecture & Features

### Multi-Stage Docker Build

The Dockerfile provides optimized builds for different environments:

- **Dependencies Stage**: Shared dependency installation
- **Development Stage**: Hot-reload with full dev dependencies  
- **Build Stage**: Production SSR build with optimizations
- **Production No-SSR Stage**: Static files with Nginx

### Health Checks & Monitoring

All containers include:
- 🏥 Built-in health checks
- 📊 Container status monitoring
- 📋 Comprehensive logging
- 🔄 Automatic restart policies

### Security Features

- 🔒 Non-root user execution
- 🛡️ Security headers in Nginx
- 🚫 Minimal attack surface
- 🔐 Proper file permissions

### Performance Optimizations

- ⚡ Angular build cache persistence
- 🗜️ Gzip compression in Nginx
- 📦 Docker layer caching
- 💾 Volume mounting for development

---

## 📂 Project Structure

```text
angular-docker-template/
├── docker-compose.yml      # Multi-profile Docker Compose config
├── Dockerfile             # Multi-stage build configuration  
├── Makefile               # Complete automation and task management
├── nginx.conf             # Optimized Nginx configuration
├── .env                   # Environment variables
├── .example.env           # Environment template
├── .dockerignore          # Docker build context optimization
└── README.md              # This comprehensive guide
```

### Generated Angular Project Structure

After running `make create`, your project will have:

```text
my-angular-app/
├── src/                   # Angular source code
├── angular.json           # Angular CLI configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── ...                    # Standard Angular project files
```

---

## 🚀 Deployment Strategies

### Development Environment

Perfect for local development with instant feedback:

```bash
make dev-detached     # Run in background
make dev-logs         # Monitor logs
make dev-shell        # Access container shell
```

### Production Options

#### SSR (Server-Side Rendering)

Best for SEO and initial page load performance:

```bash
make prod-detached    # Start SSR server in background
```

- ✅ Search engine optimization
- ✅ Fast initial page load
- ✅ Social media sharing support
- ❌ Higher server resource usage

#### Static (No SSR)

Best for CDN distribution and maximum performance:

```bash
make prod-no-ssr-detached  # Start static server in background
```

- ✅ Maximum performance
- ✅ CDN-friendly
- ✅ Lower server resources
- ❌ No SEO benefits for dynamic content

---

## � Troubleshooting

### Common Issues

**Port already in use:**
```bash
make stop              # Stop all containers
make clean             # Clean everything
```

**Build errors:**
```bash
make debug             # Check compilation errors
make rebuild           # Rebuild from scratch
```

**Container health issues:**
```bash
make health            # Check container status
make logs              # View detailed logs
```

**Performance issues:**
```bash
make prune             # Clean Docker resources
```

### Advanced Debugging

**Access container shell:**
```bash
make dev-shell         # Development container
```

**Inspect container configuration:**
```bash
make inspect           # View container details
```

**Monitor resource usage:**
```bash
make status            # Container status and ports
```

---

## 💡 Tips & Best Practices

### Development Workflow

1. **Initial Setup:**

   ```bash
   make create          # Create project (once)
   make dev            # Start development
   ```

2. **Daily Development:**

   ```bash
   make dev-detached   # Background development server
   make dev-logs       # Monitor in separate terminal
   ```

3. **Package Management:**

   ```bash
   make install pkg=rxjs               # Runtime dependencies
   make install-dev pkg=@types/node    # Development dependencies
   ```

4. **Testing & Quality:**

   ```bash
   make test           # Run unit tests
   make lint           # Check code quality
   make build-check    # Validate production build
   ```

### Production Workflow

1. **Choose deployment type** based on your needs:
   - Use `make prod` for SEO-critical applications
   - Use `make prod-no-ssr` for maximum performance

2. **Environment optimization:**
   - Configure `.env` for production settings
   - Adjust memory limits in `NODE_OPTIONS`
   - Set appropriate port numbers

3. **Monitoring:**

   ```bash
   make health         # Regular health checks
   make backup         # Regular configuration backups
   ```

### Performance Tips

- Use `dev-detached` for development to free up terminal
- Run `make clean` periodically to free disk space
- Monitor container health with `make status`
- Use `make prune` to clean Docker resources

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Angular Team for the amazing framework
- Docker Community for containerization excellence
- Nginx Team for high-performance web serving
- Open Source Community for continuous inspiration

---

**Ready to build something amazing? Start with `make create` and let Docker handle the rest!** 🚀

Happy coding! 🧑‍💻
