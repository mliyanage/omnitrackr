import { toast } from 'sonner';
import { parseErrorMessage } from './errorParser';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (error: unknown) => {
  const message = parseErrorMessage(error);
  toast.error(message);
};

export const showWarning = (message: string) => {
  toast.warning(message);
};

export const showInfo = (message: string) => {
  toast.info(message);
};
