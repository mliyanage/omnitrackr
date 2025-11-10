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

# Load Balancer outputs
output "load_balancer_ip" {
  description = "Load balancer external IP address (point your DNS to this)"
  value       = google_compute_global_address.frontend_lb.address
}

output "frontend_bucket_name" {
  description = "Cloud Storage bucket name for frontend hosting"
  value       = google_storage_bucket.frontend.name
}

output "frontend_bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = google_storage_bucket.frontend.url
}

output "ssl_certificate_id" {
  description = "SSL certificate ID"
  value       = google_compute_managed_ssl_certificate.frontend.certificate_id
}

output "ssl_certificate_domains" {
  description = "Domains configured for SSL certificate"
  value       = google_compute_managed_ssl_certificate.frontend.managed[0].domains
}

output "frontend_url" {
  description = "Frontend URL (after DNS is configured)"
  value       = "https://staging.omnitrackr.dev"
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

# Deployment instructions
output "deployment_instructions" {
  description = "Instructions for completing the deployment"
  value = <<-EOT

    Load Balancer Deployment Instructions:
    ---------------------------------------

    1. DNS Configuration:
       Point staging.omnitrackr.dev A record to: ${google_compute_global_address.frontend_lb.address}

    2. SSL Certificate:
       Certificate ID: ${google_compute_managed_ssl_certificate.frontend.certificate_id}
       Note: Certificate provisioning takes 15-30 minutes after DNS is configured
       Check status: gcloud compute ssl-certificates describe ${var.environment}-frontend-cert --global --format="get(managed.status)"

    3. Frontend Deployment:
       Build frontend: cd packages/frontend && npm run build:staging
       Deploy to bucket: gsutil -m rsync -r -d dist/ gs://${google_storage_bucket.frontend.name}/

    4. Verify Deployment:
       Frontend: https://staging.omnitrackr.dev
       API Health: https://staging.omnitrackr.dev/api/health
       Direct Cloud Run URL: ${google_cloud_run_service.api.status[0].url}

    5. Cache Management:
       Clear CDN cache: gcloud compute url-maps invalidate-cdn-cache ${var.environment}-frontend-lb --path "/*"

  EOT
}
