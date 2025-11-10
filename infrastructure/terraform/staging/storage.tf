# Cloud Storage bucket for hosting frontend static files
resource "google_storage_bucket" "frontend" {
  name                        = "${var.project_id}-frontend"
  location                    = "US"
  force_destroy               = false
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"  # SPA routing - serve index.html for 404s
  }

  # No CORS configuration needed - frontend and API are on the same domain
  # (staging.omnitrackr.dev for both frontend and API)

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 90  # Delete files older than 90 days (old deployments)
      matches_prefix = ["_old/"]
    }
  }
}

# Make all objects in the bucket publicly readable
resource "google_storage_bucket_iam_member" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
