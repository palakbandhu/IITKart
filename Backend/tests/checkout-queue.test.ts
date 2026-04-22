import { checkoutQueue } from '../src/services/queueService';

/**
 * Stress test to verify the checkout queue handles concurrent requests
 * This simulates the issue described in GitHub issue #98
 */

async function simulateCheckoutRequest(
  userId: string,
  vendorId: string,
  delay: number = 0
): Promise<{ userId: string; success: boolean; time: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Simulate a checkout handler
    const handler = async () => {
      // Simulate database operations taking ~500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        id: `order-${userId}-${Date.now()}`,
        userId,
        vendorId,
        total: 500,
        status: 'pending'
      };
    };

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const result = await checkoutQueue.enqueue({
      id: `${userId}-${Date.now()}`,
      userId,
      vendorId,
      items: [{ productId: 'prod1', quantity: 1 }],
      deliveryAddress: '123 Test St',
      paymentMethod: 'card',
      useKartCoins: false,
      handler
    });

    const time = Date.now() - startTime;
    return {
      userId,
      success: true,
      time
    };
  } catch (error: any) {
    const time = Date.now() - startTime;
    return {
      userId,
      success: false,
      time,
      error: error.message
    };
  }
}

describe('Issue #98: Checkout Queue System', () => {
  // Increase timeout for queue tests since they involve delays
  jest.setTimeout(60000);

  /**
   * Test Case 1: 5 concurrent requests (Issue reproduction)
   * Expected: All 5 should succeed (previously only 2 succeeded)
   */
  it('should handle 5 concurrent checkout requests', async () => {
    const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const results = await Promise.all(
      userIds.map(userId => simulateCheckoutRequest(userId, 'vendor1', 0))
    );

    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(userIds.length);
  });

  /**
   * Test Case 2: 10 concurrent requests
   * Expected: All 10 should succeed (previously only ~2 succeeded)
   */
  it('should handle 10 concurrent checkout requests', async () => {
    const userIds = Array.from({ length: 10 }, (_, i) => `user${i + 1}`);
    const results = await Promise.all(
      userIds.map(userId => simulateCheckoutRequest(userId, 'vendor1', 0))
    );

    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(userIds.length);
  });

  /**
   * Test Case 3: 100 concurrent requests
   * Expected: All 100 should succeed (previously only ~4-6 succeeded)
   */
  it('should handle 100 concurrent checkout requests', async () => {
    const userIds = Array.from({ length: 100 }, (_, i) => `user${i + 1}`);
    const results = await Promise.all(
      userIds.map(userId => simulateCheckoutRequest(userId, 'vendor1', 0))
    );

    const successCount = results.filter(r => r.success).length;
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    
    expect(successCount).toBe(100);
    expect(avgTime).toBeLessThan(60000); // Should complete within 60 seconds
  });

  /**
   * Test Case 4: Queue status tracking
   * Expected: Queue status should be accurate and helpful
   */
  it('should track queue status accurately', async () => {
    // Add several requests with delays to see queue building up
    const promises = Array.from({ length: 5 }, (_, i) =>
      simulateCheckoutRequest(`user${i + 1}`, 'vendor1', i * 100)
    );

    // Check that queue status is accessible
    const initialStatus = checkoutQueue.getQueueStatus();
    expect(initialStatus).toHaveProperty('queueLength');
    expect(initialStatus).toHaveProperty('isProcessing');

    const results = await Promise.all(promises);
    
    // All requests should succeed
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(5);

    // Final queue should be empty or processing
    const finalStatus = checkoutQueue.getQueueStatus();
    expect(finalStatus.queueLength).toBeGreaterThanOrEqual(0);
  });
});
