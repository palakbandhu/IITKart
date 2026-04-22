import { EventEmitter } from 'events';
import { AppError } from '../utils/AppError';

interface QueuedCheckout {
  id: string;
  userId: string;
  vendorId: string;
  items: any[];
  deliveryAddress: string;
  paymentMethod: string;
  useKartCoins: boolean;
  handler: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class CheckoutQueue extends EventEmitter {
  private queue: QueuedCheckout[] = [];
  private isProcessing = false;
  private processTimeout: NodeJS.Timeout | null = null;
  private readonly PROCESS_INTERVAL = 100; // milliseconds between processing attempts

  /**
   * Add a checkout request to the queue
   */
  enqueue(checkoutData: Omit<QueuedCheckout, 'resolve' | 'reject' | 'timestamp'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedItem: QueuedCheckout = {
        ...checkoutData,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(queuedItem);
      
      // Log queue status
      const queueLength = this.queue.length;
      console.log(`[Queue] Checkout queued. Queue length: ${queueLength}. User: ${checkoutData.userId}`);

      // Trigger processing
      this.processQueue();
    });
  }

  /**
   * Process queue items sequentially
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const checkoutItem = this.queue[0];

        try {
          console.log(`[Queue] Processing checkout. Remaining in queue: ${this.queue.length - 1}. User: ${checkoutItem.userId}`);
          
          // Execute the checkout handler
          const result = await checkoutItem.handler();
          
          // Resolve the promise
          checkoutItem.resolve(result);
          console.log(`[Queue] Checkout completed successfully. User: ${checkoutItem.userId}`);
        } catch (error) {
          // Reject the promise with the error
          checkoutItem.reject(error);
          console.error(`[Queue] Checkout failed. User: ${checkoutItem.userId}. Error:`, error);
        }

        // Remove processed item from queue
        this.queue.shift();
      }
    } finally {
      this.isProcessing = false;
      
      // Clear any pending timeout
      if (this.processTimeout) {
        clearTimeout(this.processTimeout);
        this.processTimeout = null;
      }
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean; estimatedWaitTime: number } {
    // Rough estimate: ~500ms per checkout + current processing time
    const estimatedWaitTime = this.queue.length * 500;
    
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      estimatedWaitTime
    };
  }

  /**
   * Clear the queue (for testing/admin purposes)
   */
  clearQueue(): void {
    const remainingItems = this.queue.length;
    this.queue.forEach(item => {
      item.reject(new AppError('Queue was cleared', 400));
    });
    this.queue = [];
    console.log(`[Queue] Queue cleared. Items cleared: ${remainingItems}`);
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const checkoutQueue = new CheckoutQueue();
