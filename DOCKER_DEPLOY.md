# Library of Stuff - Docker Deployment Guide

This guide explains how to deploy the Library of Stuff application on a local Linux server using Docker.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose v2.0+ installed
- At least 2GB of free RAM
- At least 10GB of free disk space

## Quick Start

### 1. Clone or copy the application

Copy all application files to your server.

### 2. Create environment file

```bash
cp .env.example .env
```

Edit the `.env` file and set a secure session secret:

```bash
# Generate a secure random secret
openssl rand -base64 32
```

Update the `SESSION_SECRET` in your `.env` file with the generated value.

### 3. Generate SSL certificates

The application uses HTTPS for secure session cookies. Generate self-signed certificates:

```bash
cd nginx
chmod +x generate-certs.sh
./generate-certs.sh
cd ..
```

This creates self-signed certificates valid for 1 year. For production with a real domain, replace with Let's Encrypt certificates.

### 4. Build and start the application

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f
```

### 6. Initialize the database

After the containers are running, push the database schema:

```bash
docker compose exec app npm run db:push
```

### 7. Access the application

Open your browser and navigate to:
- Application: https://localhost (your browser will warn about the self-signed certificate - click "Advanced" and proceed)
- Database Admin (optional): http://localhost:8080 (if using the admin profile)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@db:5432/libraryofstuff` |
| `SESSION_SECRET` | Secret key for session encryption | (required) |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `5000` |

### Docker Compose Profiles

- **Default**: Runs the app and database only
- **admin**: Includes Adminer database admin UI

To include the admin UI:
```bash
docker compose --profile admin up -d
```

## Common Operations

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f db
```

### Restart services

```bash
docker compose restart
```

### Stop services

```bash
docker compose stop
```

### Stop and remove containers

```bash
docker compose down
```

### Stop and remove everything (including volumes)

⚠️ **Warning**: This will delete all data!

```bash
docker compose down -v
```

### Rebuild after code changes

```bash
docker compose up -d --build
```

### Database backup

```bash
# Create backup
docker compose exec db pg_dump -U postgres libraryofstuff > backup.sql

# Restore backup
docker compose exec -T db psql -U postgres libraryofstuff < backup.sql
```

### Access database shell

```bash
docker compose exec db psql -U postgres libraryofstuff
```

## Production Deployment

For production deployment, consider the following:

### 1. Use secure passwords

Update the PostgreSQL password in `docker-compose.yml`:

```yaml
environment:
  - POSTGRES_PASSWORD=your-secure-password
```

Update `DATABASE_URL` in `.env` to match.

### 2. Set up SSL/TLS

Use a reverse proxy like Nginx or Traefik with Let's Encrypt SSL certificates.

### 3. Configure firewall

Only expose necessary ports (typically just 80 and 443 through reverse proxy).

### 4. Set up backups

Create automated backup scripts for the database and uploads volume.

### 5. Monitor resources

Set up monitoring for container health, disk usage, and memory.

## Reverse Proxy Example (Nginx)

Create an Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs app
```

Common issues:
- Database not ready: Wait a few seconds and try again
- Missing environment variables: Check `.env` file

### Database connection errors

Ensure the database container is healthy:
```bash
docker compose ps
```

### Port already in use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3000:5000"  # Change 5000 to your preferred port
```

### Out of disk space

Clean up Docker resources:
```bash
docker system prune -a
```

## File Persistence

The following data is persisted in Docker volumes:

- `postgres_data`: Database files
- `uploads_data`: User-uploaded images

To back up these volumes:
```bash
# Create backup directory
mkdir -p backups

# Backup database volume
docker run --rm -v library-of-stuff_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_data.tar.gz /data

# Backup uploads volume
docker run --rm -v library-of-stuff_uploads_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/uploads_data.tar.gz /data
```
