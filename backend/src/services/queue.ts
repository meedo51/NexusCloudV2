// Simple in-memory job queue
type JobHandler = (job: any) => Promise<void>;

class JobQueue {
  private queue: any[] = [];
  private processing = false;
  private handlers: Map<string, JobHandler> = new Map();

  register(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
  }

  add(jobType: string, data: any): void {
    this.queue.push({ type: jobType, data, id: Math.random().toString(36).substr(2, 9) });
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const job = this.queue.shift();
    try {
      const handler = this.handlers.get(job.type);
      if (handler) await handler(job);
      else console.warn(`No handler for job type: ${job.type}`);
    } catch (err) {
      console.error(`Job ${job.type} failed:`, err);
    }
    this.processing = false;
    this.processNext();
  }
}

export const jobQueue = new JobQueue();
