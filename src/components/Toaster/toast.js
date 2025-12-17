import { toast as hotToast } from 'react-hot-toast';
import styles from './Toaster.module.css';

const DEFAULT_DURATION_MS = 5000;

function normalizeOptions(options = {}) {
  const duration =
    typeof options.duration === 'number' ? options.duration : DEFAULT_DURATION_MS;

  return {
    duration,
    ...options,
    // Ensure we always use our consistent styling
    style: undefined,
  };
}

function show(variantClass, message, options) {
  const opts = normalizeOptions(options);
  const className = [variantClass, opts.className].filter(Boolean).join(' ');

  // Use the "blank" toast so we control the full UI via our custom <Toaster /> render
  return hotToast(message, {
    ...opts,
    icon: null,
    className,
  });
}

function toast(message, options) {
  return show(styles.default, message, options);
}

toast.success = (message, options) => show(styles.success, message, options);
toast.warning = (message, options) => show(styles.warning, message, options);
toast.error = (message, options) => show(styles.error, message, options);
toast.dismiss = hotToast.dismiss;
toast.remove = hotToast.remove;
toast.promise = hotToast.promise;

export { toast };
export default toast;


