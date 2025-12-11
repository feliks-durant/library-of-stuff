#!/bin/bash
# Generate self-signed SSL certificates for local development
# Run this script once before starting Docker Compose

mkdir -p certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -subj "/C=US/ST=Local/L=Local/O=LibraryOfStuff/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Self-signed certificates generated in nginx/certs/"
echo "Note: Your browser will show a security warning - this is normal for self-signed certs"
