variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "omnitrackr-staging-v2"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "omnitrackr"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "omnitrackr_user"
}

variable "api_min_instances" {
  description = "Minimum number of API instances"
  type        = number
  default     = 1
}

variable "api_max_instances" {
  description = "Maximum number of API instances"
  type        = number
  default     = 10
}

variable "api_memory" {
  description = "Memory for API service"
  type        = string
  default     = "512Mi"
}

variable "api_cpu" {
  description = "CPU for API service"
  type        = string
  default     = "1"
}

variable "worker_min_instances" {
  description = "Minimum number of Worker instances"
  type        = number
  default     = 0
}

variable "worker_max_instances" {
  description = "Maximum number of Worker instances"
  type        = number
  default     = 5
}

variable "worker_memory" {
  description = "Memory for Worker service"
  type        = string
  default     = "512Mi"
}

variable "worker_cpu" {
  description = "CPU for Worker service"
  type        = string
  default     = "0.5"
}
