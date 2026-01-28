import posthog from 'posthog-js';

export const analytics = {
  track: (event: string, properties?: object) => {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties);
    }
  },

  identify: (userId: string, traits?: object) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, traits);
    }
  },

  reset: () => {
    if (typeof window !== 'undefined') {
      posthog.reset();
    }
  },
};
