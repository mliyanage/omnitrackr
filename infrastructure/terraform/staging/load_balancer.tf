# Reserve a global static IP address for the load balancer
resource "google_compute_global_address" "frontend_lb" {
  name         = "${var.environment}-frontend-lb-ip"
  address_type = "EXTERNAL"
}

# Google-managed SSL certificate for HTTPS
resource "google_compute_managed_ssl_certificate" "frontend" {
  name = "${var.environment}-frontend-cert"

  managed {
    domains = ["staging.omnitrackr.dev"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Backend bucket for serving static frontend files from Cloud Storage
resource "google_compute_backend_bucket" "frontend" {
  name        = "${var.environment}-frontend-backend"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = false  # CDN and caching disabled for staging

  # Explicitly disable caching for staging environment
  # CACHE_ALL_STATIC with TTL=0 overrides origin headers and disables caching
  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    client_ttl  = 0
    default_ttl = 0
    max_ttl     = 0
  }
}

# Create a serverless NEG (Network Endpoint Group) for Cloud Run API
resource "google_compute_region_network_endpoint_group" "api_neg" {
  name                  = "${var.environment}-api-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_service.api.name
  }
}

# Backend service for Cloud Run API
resource "google_compute_backend_service" "api" {
  name                            = "${var.environment}-api-backend"
  protocol                        = "HTTP"
  port_name                       = "http"
  timeout_sec                     = 30
  enable_cdn                      = false
  connection_draining_timeout_sec = 10

  backend {
    group = google_compute_region_network_endpoint_group.api_neg.id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# URL map to route traffic:
# - /api/* -> Cloud Run backend
# - /* -> Cloud Storage bucket
resource "google_compute_url_map" "frontend" {
  name            = "${var.environment}-frontend-lb"
  default_service = google_compute_backend_bucket.frontend.id

  host_rule {
    hosts        = ["staging.omnitrackr.dev"]
    path_matcher = "all-paths"
  }

  path_matcher {
    name            = "all-paths"
    default_service = google_compute_backend_bucket.frontend.id

    # Route /api/* to Cloud Run backend
    path_rule {
      paths   = ["/api", "/api/*"]
      service = google_compute_backend_service.api.id
    }

    # Everything else goes to the frontend bucket
    path_rule {
      paths   = ["/*"]
      service = google_compute_backend_bucket.frontend.id
    }
  }
}

# HTTPS proxy to terminate SSL and forward to URL map
resource "google_compute_target_https_proxy" "frontend" {
  name             = "${var.environment}-frontend-https-proxy"
  url_map          = google_compute_url_map.frontend.id
  ssl_certificates = [google_compute_managed_ssl_certificate.frontend.id]
}

# Global forwarding rule to listen on port 443 and route to HTTPS proxy
resource "google_compute_global_forwarding_rule" "frontend_https" {
  name                  = "${var.environment}-frontend-https"
  target                = google_compute_target_https_proxy.frontend.id
  port_range            = "443"
  ip_address            = google_compute_global_address.frontend_lb.address
  load_balancing_scheme = "EXTERNAL"
}

# Optional: HTTP to HTTPS redirect
resource "google_compute_url_map" "https_redirect" {
  name = "${var.environment}-https-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "https_redirect" {
  name    = "${var.environment}-http-proxy"
  url_map = google_compute_url_map.https_redirect.id
}

resource "google_compute_global_forwarding_rule" "frontend_http" {
  name                  = "${var.environment}-frontend-http"
  target                = google_compute_target_http_proxy.https_redirect.id
  port_range            = "80"
  ip_address            = google_compute_global_address.frontend_lb.address
  load_balancing_scheme = "EXTERNAL"
}
