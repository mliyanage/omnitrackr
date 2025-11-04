output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

output "database_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "database_public_ip" {
  description = "Cloud SQL public IP address"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "database_name" {
  description = "Database name"
  value       = google_sql_database.database.name
}

output "database_user" {
  description = "Database user"
  value       = google_sql_user.user.name
  sensitive   = true
}

output "api_service_url" {
  description = "Cloud Run API service URL"
  value       = google_cloud_run_service.api.status[0].url
}
/*
output "worker_service_url" {
  description = "Cloud Run Worker service URL"
  value       = google_cloud_run_service.worker.status[0].url
}
*/
output "cloud_run_service_account" {
  description = "Service account email for Cloud Run services"
  value       = google_service_account.cloud_run.email
}

output "secret_db_password_id" {
  description = "Secret Manager ID for database password"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "secret_jwt_secret_id" {
  description = "Secret Manager ID for JWT secret"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

# Connection instructions
output "connection_instructions" {
  description = "How to connect to the database"
  value = <<-EOT

    Database Connection Details:
    ----------------------------
    Host: ${google_sql_database_instance.postgres.public_ip_address}
    Port: 5432
    Database: ${var.db_name}
    User: ${var.db_user}

    To get the password, run:
    gcloud secrets versions access latest --secret="db-password" --project="${var.project_id}"

    Or connect using Cloud SQL Proxy:
    cloud-sql-proxy ${google_sql_database_instance.postgres.connection_name}

    API Service URL:
    ${google_cloud_run_service.api.status[0].url}

  EOT
}
