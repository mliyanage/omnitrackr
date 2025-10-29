# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "postgres" {
  name             = "omnitrackr-${var.environment}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  # Prevent accidental deletion
  deletion_protection = true

  settings {
    # Tier determines CPU/memory (db-f1-micro = 0.6GB RAM, shared CPU)
    tier = "db-f1-micro"

    # Storage
    disk_size       = 10
    disk_type       = "PD_SSD"
    disk_autoresize = true

    # Backups
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = false
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    # IP configuration
    ip_configuration {
      ipv4_enabled    = true
      private_network = null

      # For now, allow connections from anywhere
      # In production, restrict this to Cloud Run IP ranges or use private IP
      authorized_networks {
        name  = "allow-all-temporary"
        value = "0.0.0.0/0"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # 3 AM
      update_track = "stable"
    }
  }

  depends_on = [google_project_service.required_apis]
}

# Database
resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

# Database user
resource "google_sql_user" "user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}
