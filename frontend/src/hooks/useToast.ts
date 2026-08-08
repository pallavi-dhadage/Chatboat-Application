import toast from 'react-hot-toast';

/** Maximum character length enforced on all toast messages. */
const MAX_LENGTH = 80;

function truncate(msg: string): string {
  return msg.slice(0, MAX_LENGTH);
}

export interface UseToastReturn {
  /**
   * Display a green success toast.
   * Message is truncated to ≤80 characters.
   *
   * @param message - Human-readable success text.
   */
  success: (message: string) => void;
  /**
   * Display a red error toast with a longer auto-dismiss (5 s).
   * Message is truncated to ≤80 characters.
   *
   * @param message - Human-readable error text.
   */
  error: (message: string) => void;
  /**
   * Display a neutral informational toast.
   * Message is truncated to ≤80 characters.
   *
   * @param message - Human-readable informational text.
   */
  info: (message: string) => void;
}

/**
 * Typed wrapper around `react-hot-toast` that enforces a maximum message
 * length of 80 characters to keep toasts concise and non-duplicative of
 * inline form validation errors.
 *
 * @returns `{ success, error, info }` helpers.
 *
 * @example
 * ```tsx
 * const { success, error } = useToast();
 *
 * const handleSave = async () => {
 *   try {
 *     await saveProfile();
 *     success('Profile updated successfully');
 *   } catch (e) {
 *     error('Failed to update profile. Please try again.');
 *   }
 * };
 * ```
 */
export function useToast(): UseToastReturn {
  return {
    success: (message: string) => toast.success(truncate(message)),
    error: (message: string) =>
      toast.error(truncate(message), { duration: 5000 }),
    info: (message: string) => toast(truncate(message)),
  };
}
