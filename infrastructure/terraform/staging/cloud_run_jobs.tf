# Cloud Run Jobs for Worker
# Jobs are triggered by Cloud Scheduler on a cron schedule

# Polling Worker Job
resource "google_cloud_run_v2_job" "polling_worker" {
  name     = "omnitrackr-polling-worker-staging"
  location = var.region

  template {
    template {
      service_account = google_service_account.cloud_run.email

      containers {
        # Placeholder image - will be updated by GitHub Actions
        image = "gcr.io/cloudrun/hello"

        resources {
          limits = {
            cpu    = "1"
            memory = var.worker_memory
          }
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "RUN_MODE"
          value = "job"
        }

        env {
          name  = "DB_HOST"
          value = google_sql_database_instance.postgres.public_ip_address
        }

        env {
          name  = "DB_PORT"
          value = "5432"
        }

        env {
          name  = "DB_NAME"
          value = var.db_name
        }

        env {
          name  = "DB_USER"
          value = var.db_user
        }

        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password.secret_id
              version = "latest"
            }
          }
        }

        env {
          name  = "POLLING_WORKER_ENABLED"
          value = "true"
        }

        env {
          name  = "POLLING_BATCH_SIZE"
          value = "50"
        }

        env {
          name  = "SLA_MONITOR_ENABLED"
          value = "false"
        }

        env {
          name  = "LOG_LEVEL"
          value = "info"
        }

        env {
          name  = "LOG_FORMAT"
          value = "json"
        }
      }

      timeout         = "600s" # 10 minutes max per job execution
      max_retries     = 1
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres,
    google_secret_manager_secret_version.db_password,
  ]

  # Ignore changes made by GitHub Actions deployments
  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}

# SLA Monitor Worker Job
resource "google_cloud_run_v2_job" "sla_monitor" {
  name     = "omnitrackr-sla-monitor-staging"
  location = var.region

  template {
    template {
      service_account = google_service_account.cloud_run.email

      containers {
        # Placeholder image - will be updated by GitHub Actions
        image = "gcr.io/cloudrun/hello"

        resources {
          limits = {
            cpu    = "1"
            memory = var.worker_memory
          }
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "RUN_MODE"
          value = "job"
        }

        env {
          name  = "DB_HOST"
          value = google_sql_database_instance.postgres.public_ip_address
        }

        env {
          name  = "DB_PORT"
          value = "5432"
        }

        env {
          name  = "DB_NAME"
          value = var.db_name
        }

        env {
          name  = "DB_USER"
          value = var.db_user
        }

        env {
          name = "DB_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.db_password.secret_id
              version = "latest"
            }
          }
        }

        env {
          name  = "POLLING_WORKER_ENABLED"
          value = "false"
        }

        env {
          name  = "SLA_MONITOR_ENABLED"
          value = "true"
        }

        env {
          name  = "SLA_LOOKBACK_HOURS"
          value = "24"
        }

        env {
          name  = "LOG_LEVEL"
          value = "info"
        }

        env {
          name  = "LOG_FORMAT"
          value = "json"
        }
      }

      timeout         = "600s" # 10 minutes max per job execution
      max_retries     = 1
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres,
    google_secret_manager_secret_version.db_password,
  ]

  # Ignore changes made by GitHub Actions deployments
  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}

# Cloud Scheduler Jobs to trigger the workers

# Polling Worker Schedule (runs every minute)
resource "google_cloud_scheduler_job" "polling_trigger" {
  name             = "polling-worker-trigger-staging"
  description      = "Trigger polling worker job every minute"
  schedule         = "* * * * *" # Every minute
  time_zone        = "America/New_York"
  attempt_deadline = "600s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.polling_worker.name}:run"

    oauth_token {
      service_account_email = google_service_account.cloud_run.email
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_cloud_run_v2_job.polling_worker,
  ]
}

# SLA Monitor Schedule (runs every 5 minutes)
resource "google_cloud_scheduler_job" "sla_monitor_trigger" {
  name             = "sla-monitor-trigger-staging"
  description      = "Trigger SLA monitor job every 5 minutes"
  schedule         = "*/5 * * * *" # Every 5 minutes
  time_zone        = "America/New_York"
  attempt_deadline = "600s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.sla_monitor.name}:run"

    oauth_token {
      service_account_email = google_service_account.cloud_run.email
    }
  }

  depends_on = [
    google_project_service.required_apis,
    google_cloud_run_v2_job.sla_monitor,
  ]
}
