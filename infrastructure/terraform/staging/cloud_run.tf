# Note: Cloud Run services will be deployed via GitHub Actions
# This file creates placeholder services that GitHub Actions will update

# Cloud Run API Service
resource "google_cloud_run_service" "api" {
  name     = "omnitrackr-api-staging"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.cloud_run.email

      containers {
        # Placeholder image - will be updated by GitHub Actions
        image = "gcr.io/cloudrun/hello"

        resources {
          limits = {
            cpu    = var.api_cpu
            memory = var.api_memory
          }
        }

        ports {
          container_port = 3000
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
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

        # Database password from Secret Manager
        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }

        # JWT secret from Secret Manager
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret.secret_id
              key  = "latest"
            }
          }
        }
      }

      # Auto-scaling configuration
      container_concurrency = 80
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.api_min_instances)
        "autoscaling.knative.dev/maxScale" = tostring(var.api_max_instances)
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres,
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_version.jwt_secret,
  ]

  # Ignore changes made by GitHub Actions deployments
  lifecycle {
    ignore_changes = [
      template[0].metadata[0].annotations,
      template[0].spec[0].containers[0].image,
      template[0].spec[0].containers[0].env,
    ]
  }
}

/*
# Cloud Run Worker Service
resource "google_cloud_run_service" "worker" {
  name     = "omnitrackr-worker"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.cloud_run.email

      containers {
        # Placeholder image - will be updated by GitHub Actions
        image = "gcr.io/cloudrun/hello"

        resources {
          limits = {
            cpu    = var.worker_cpu
            memory = var.worker_memory
          }
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
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

        # Database password from Secret Manager
        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }
      }

      container_concurrency = 1
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.worker_min_instances)
        "autoscaling.knative.dev/maxScale" = tostring(var.worker_max_instances)
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres,
    google_secret_manager_secret_version.db_password,
  ]
}
*/
# Allow public access to API service
resource "google_cloud_run_service_iam_member" "api_public" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Worker service is NOT publicly accessible (only via Cloud Scheduler or internal invocation)
