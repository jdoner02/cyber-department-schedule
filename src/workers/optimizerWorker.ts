/**
 * =============================================================================
 * WORKER: optimizerWorker
 * =============================================================================
 *
 * PURPOSE: Run schedule optimization in a background thread to avoid blocking
 * the main UI thread. Posts progress updates back to the main thread.
 *
 * USAGE:
 *   const worker = new Worker(new URL('./optimizerWorker.ts', import.meta.url));
 *   worker.postMessage({ courses, options });
 *   worker.onmessage = (e) => {
 *     if (e.data.type === 'progress') console.log(e.data.progress);
 *     if (e.data.type === 'result') console.log(e.data.permutations);
 *   };
 *
 * =============================================================================
 */

import type { Course } from '../types/schedule';
import type { OptimizerOptions, SchedulePermutation } from '../services/scheduleOptimizer';
import { optimizeSchedule } from '../services/scheduleOptimizer';

interface WorkerMessage {
  courses: Course[];
  options?: Partial<OptimizerOptions>;
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
}

interface ResultMessage {
  type: 'result';
  permutations: SchedulePermutation[];
  elapsed: number;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerResponse = ProgressMessage | ResultMessage | ErrorMessage;

// Handle messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { courses, options } = event.data;
  const startTime = Date.now();

  try {
    // Run optimization with progress callback
    const permutations = optimizeSchedule(courses, {
      ...options,
      onProgress: (progress: number) => {
        const response: ProgressMessage = { type: 'progress', progress };
        self.postMessage(response);
      },
    });

    // Send results
    const elapsed = Date.now() - startTime;
    const response: ResultMessage = {
      type: 'result',
      permutations,
      elapsed,
    };
    self.postMessage(response);
  } catch (error) {
    const response: ErrorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};

// Export types for use in main thread
export type { WorkerMessage, WorkerResponse, ProgressMessage, ResultMessage, ErrorMessage };
