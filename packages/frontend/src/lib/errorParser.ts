/**
 * Parse API errors and return user-friendly messages
 */
export function parseErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // If error is a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Extract the actual error message from axios error response
  let errorMessage = '';

  // Check if it's an axios error with response data
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as any;

    // Try to get error message from response.data.error.message (our API format)
    if (axiosError.response?.data?.error?.message) {
      errorMessage = axiosError.response.data.error.message;
    }
    // Try to get error message from response.data.message
    else if (axiosError.response?.data?.message) {
      errorMessage = axiosError.response.data.message;
    }
    // Try to get the full error object as string if it contains useful info
    else if (axiosError.response?.data?.error) {
      errorMessage = JSON.stringify(axiosError.response.data.error);
    }
    // Try response.data as string
    else if (typeof axiosError.response?.data === 'string') {
      errorMessage = axiosError.response.data;
    }
    // Fall back to error.message
    else if (axiosError.message) {
      errorMessage = axiosError.message;
    }
  }

  // Handle HTTP status code errors with generic messages if no specific error details
  if (errorMessage.includes('status code 400') && !errorMessage.includes('duplicate key') && !errorMessage.includes('foreign key') && !errorMessage.includes('null value')) {
    return 'Invalid request. Please check your input and try again.';
  }

  if (errorMessage.includes('status code 401')) {
    return 'You are not authorized. Please log in and try again.';
  }

  if (errorMessage.includes('status code 500') && !errorMessage.includes('duplicate key') && !errorMessage.includes('foreign key') && !errorMessage.includes('null value')) {
    return 'An error occurred on the server. Please try again or contact support if the problem persists.';
  }

  // Parse duplicate key constraint errors
  if (errorMessage.includes('duplicate key value violates unique constraint')) {
    // Extract entity name from constraint name if possible
    if (errorMessage.includes('schedules_name_unique')) {
      return 'A schedule with this name already exists. Please choose a different name.';
    }
    if (errorMessage.includes('connections_name_unique')) {
      return 'A connection with this name already exists. Please choose a different name.';
    }
    if (errorMessage.includes('watchers_name_unique')) {
      return 'A watcher with this name already exists. Please choose a different name.';
    }
    if (errorMessage.includes('ref_data')) {
      return 'A record with this code or name already exists. Please choose a different value.';
    }
    return 'A record with this name already exists. Please choose a different name.';
  }

  // Parse foreign key constraint errors
  if (errorMessage.includes('foreign key constraint')) {
    return 'This record cannot be deleted because it is being used by other records.';
  }

  // Parse not null constraint errors
  if (errorMessage.includes('null value in column')) {
    const columnMatch = errorMessage.match(/column "([^"]+)"/);
    const column = columnMatch ? columnMatch[1] : 'field';
    return `The ${column.replace(/_/g, ' ')} is required.`;
  }

  // Parse column does not exist errors
  if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
    return 'There was a system error. Please refresh the page and try again. If the problem persists, contact support.';
  }

  // Parse validation errors
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return errorMessage;
  }

  // Parse 404 errors
  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'The requested record was not found.';
  }

  // Parse 403 errors
  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return 'You do not have permission to perform this action.';
  }

  // Parse network errors
  if (errorMessage.includes('network') || errorMessage.includes('Network Error')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Return the original message if we can't parse it better
  return errorMessage || 'An unexpected error occurred. Please try again.';
}
