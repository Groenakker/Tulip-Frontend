import React from 'react';
import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast';
import styles from './Toaster.module.css';

const DEFAULT_DURATION_MS = 5000;

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={12}
      containerClassName={styles.container}
      toastOptions={{
        duration: DEFAULT_DURATION_MS,
      }}
    >
      {(t) => {
        const duration =
          typeof t.duration === 'number' && Number.isFinite(t.duration)
            ? t.duration
            : DEFAULT_DURATION_MS;
        const showTimeBar = duration > 0 && duration !== Infinity;

        return (
          <div className={`${styles.toast} ${t.className || styles.default}`}>
            {showTimeBar && (
              <div className={styles.timeBarTrack}>
                <div
                  className={styles.timeBarFill}
                  style={{ animationDuration: `${duration}ms` }}
                />
              </div>
            )}

            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Close notification"
              onClick={() => hotToast.dismiss(t.id)}
            >
              ×
            </button>

            <div className={styles.body}>
              <div className={styles.message}>{t.message}</div>
            </div>
          </div>
        );
      }}
    </HotToaster>
  );
}


