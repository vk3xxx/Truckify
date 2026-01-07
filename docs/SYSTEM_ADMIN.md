# System Admin Configuration Management

## Overview

A comprehensive system administration interface for managing Truckify's configuration, API settings, database credentials, and external service keys with secure encryption and backup/restore capabilities.

## Features

### 1. **Secure Configuration Management**
- View and edit all system configurations in one place
- Encrypted storage for sensitive data (passwords, API keys)
- Real-time validation and error handling
- Password visibility toggle for sensitive fields

### 2. **Configuration Sections**

#### API Configuration
- API Gateway port
- Request timeout settings
- Rate limiting parameters

#### Security
- JWT secret key
- JWT expiry time
- Refresh token expiry duration

#### Database
- PostgreSQL host, port, user, password
- Database name and SSL mode
- Connection pooling settings

#### External Services
- Payment gateway API keys
- SMS service credentials
- Email service credentials

### 3. **Backup & Restore**
- **Encrypted Backups**: All configurations backed up with AES-256 encryption
- **Password Protected**: Requires a strong password to encrypt/decrypt backups
- **JSON Format**: Easy to version control and audit
- **Timestamped Files**: Automatic naming with date stamps

### 4. **Security Features**
- Admin-only access (requires `user_type: 'admin'`)
- AES-256-GCM encryption for sensitive fields
- Password-protected backup/restore
- Audit trail (last modified timestamp and user)
- No plaintext storage of secrets

## Access

### Frontend
- **URL**: http://localhost:5173/system-admin
- **Requirements**: Admin user account
- **Navigation**: Navbar → System Config (admin only)

### Backend API
- **Service**: Admin Service (Port 8017)
- **Base URL**: http://localhost:8017/api/v1/admin

## API Endpoints

### Get Configuration
```bash
GET /api/v1/admin/config
```
Returns current system configuration with all sections and fields.

### Save Configuration
```bash
POST /api/v1/admin/config
Content-Type: application/json

{
  "sections": [...],
  "lastModified": "2026-01-07T17:43:19Z",
  "modifiedBy": "admin@example.com"
}
```

### Backup Configuration
```bash
POST /api/v1/admin/config/backup
Content-Type: application/json

{
  "password": "strong-backup-password"
}
```
Returns encrypted backup data.

### Restore Configuration
```bash
POST /api/v1/admin/config/restore
Content-Type: multipart/form-data

file: <backup-file.json>
password: <backup-password>
```

## Usage Guide

### 1. Accessing System Admin
1. Log in as an admin user
2. Click "System Config" in the navbar
3. You'll see all configuration sections

### 2. Modifying Configuration
1. Edit any field directly in the form
2. Encrypted fields show a password toggle
3. Click "Save Configuration" to persist changes
4. Success message confirms the save

### 3. Backing Up Configuration
1. Click "Backup Config" button
2. Enter a strong backup password
3. File downloads automatically as `truckify-config-backup-YYYY-MM-DD.json`
4. Store securely (encrypted with your password)

### 4. Restoring Configuration
1. Click "Restore Config" button
2. Select a backup file
3. Enter the backup password
4. Configuration is restored and applied immediately

## Security Best Practices

### Passwords
- Use strong, unique passwords for backups
- Store backup passwords in a secure password manager
- Never share backup files or passwords

### API Keys
- Rotate API keys regularly
- Use environment-specific keys (dev, staging, prod)
- Never commit keys to version control
- Use this admin panel instead of .env files

### Database Credentials
- Use strong database passwords
- Limit database user permissions
- Enable SSL for database connections
- Regularly audit database access logs

### Backups
- Store backups in a secure location
- Encrypt backups before uploading to cloud storage
- Test restore procedures regularly
- Keep multiple backup versions

## Environment Variables

The admin service reads from these environment variables:

```bash
ADMIN_PORT=8017                    # Admin service port
API_PORT=8000                      # API Gateway port
JWT_SECRET=your-secret-key         # JWT signing key
DB_HOST=postgres                   # Database host
DB_PORT=5432                       # Database port
DB_USER=truckify                   # Database user
DB_PASSWORD=truckify_password      # Database password
PAYMENT_API_KEY=your-key           # Payment service key
SMS_API_KEY=your-key               # SMS service key
EMAIL_API_KEY=your-key             # Email service key
```

## Docker Deployment

The admin service is included in docker-compose:

```bash
# Start admin service
docker-compose up -d admin-service

# View logs
docker-compose logs -f admin-service

# Stop admin service
docker-compose stop admin-service
```

## Encryption Details

### Algorithm
- **Cipher**: AES-256-GCM
- **Key Derivation**: SHA-256 hash of password
- **Nonce**: Random 12-byte nonce per encryption
- **Encoding**: Base64 for transport

### Encrypted Fields
- JWT Secret
- Database Password
- Payment API Key
- SMS API Key
- Email API Key

## Troubleshooting

### Cannot Access System Admin Page
- Verify you're logged in as an admin user
- Check browser console for errors
- Ensure admin service is running: `docker-compose ps admin-service`

### Backup/Restore Fails
- Verify backup password is correct
- Check file format is valid JSON
- Ensure admin service has write permissions
- Check disk space for backup files

### Configuration Not Saving
- Verify all required fields are filled
- Check admin service logs: `docker-compose logs admin-service`
- Ensure database connection is working
- Try refreshing the page

### Encryption Errors
- Verify password meets complexity requirements
- Check for special characters in password
- Ensure backup file hasn't been corrupted
- Try with a simpler password first

## Future Enhancements

- [ ] Configuration versioning and rollback
- [ ] Audit log with detailed change history
- [ ] Configuration templates for different environments
- [ ] Scheduled backups to cloud storage
- [ ] Configuration validation and health checks
- [ ] Multi-user approval workflow for sensitive changes
- [ ] Configuration diff viewer
- [ ] Integration with HashiCorp Vault

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review admin service logs
3. Contact the development team
4. Open an issue on GitHub
