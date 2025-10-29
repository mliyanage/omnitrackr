terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Optional: Store Terraform state in GCS bucket for team collaboration
  # Uncomment after creating a GCS bucket for state storage
  # backend "gcs" {
  #   bucket = "omnitrackr-terraform-state"
  #   prefix = "staging"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs (if not already enabled)
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "vpcaccess.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}
