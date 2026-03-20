import { DEFAULT_SERVER_ERROR_MESSAGE, createSafeActionClient } from 'next-safe-action';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MIN_ACTION_DURATION = process.env.NODE_ENV === 'development' ? 1500 : 0;

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e.message) return e.message;
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
}).use(async ({ next, clientInput }) => {
  const startTime = performance.now();
  const actionId = Math.random().toString(36).substring(2, 9);

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[${actionId}] Action started`);
    console.warn(`[${actionId}] Input:`, clientInput);
  }

  try {
    const result = await next();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${actionId}] Completed in ${duration}ms`);
      console.warn(`[${actionId}] Output:`, result);
    }

    if (duration < MIN_ACTION_DURATION) {
      await wait(MIN_ACTION_DURATION - duration);
    }

    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${actionId}] Action failed:`, error);
    }
    throw error;
  }
});
