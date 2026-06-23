/**
 * Hybrid Logical Clock (HLC) implementation.
 * Provides monotonically increasing timestamps that account for clock skew
 * across devices, enabling causal ordering of operations.
 *
 * Format: "<wallclock_ms>:<counter>:<node_id>"
 */

export class HLC {
  private wallClock: number = 0;
  private counter: number = 0;
  private nodeId: string;

  constructor(nodeId?: string) {
    this.nodeId = nodeId || this.generateNodeId();
  }

  /**
   * Generate a new HLC timestamp for a local event.
   */
  now(): string {
    const physicalTime = Date.now();

    if (physicalTime > this.wallClock) {
      this.wallClock = physicalTime;
      this.counter = 0;
    } else {
      this.counter++;
    }

    return this.toString();
  }

  /**
   * Receive a remote HLC timestamp and merge with local clock.
   * Ensures the local clock is always >= the remote clock.
   */
  receive(remoteTimestamp: string): string {
    const remote = HLC.parse(remoteTimestamp);
    const physicalTime = Date.now();

    if (physicalTime > this.wallClock && physicalTime > remote.wallClock) {
      this.wallClock = physicalTime;
      this.counter = 0;
    } else if (this.wallClock === remote.wallClock) {
      this.counter = Math.max(this.counter, remote.counter) + 1;
    } else if (remote.wallClock > this.wallClock) {
      this.wallClock = remote.wallClock;
      this.counter = remote.counter + 1;
    } else {
      // this.wallClock > remote.wallClock
      this.counter++;
    }

    return this.toString();
  }

  /**
   * Compare two HLC timestamps. Returns:
   *  -1 if a < b
   *   0 if a === b
   *   1 if a > b
   */
  static compare(a: string, b: string): number {
    const parsedA = HLC.parse(a);
    const parsedB = HLC.parse(b);

    if (parsedA.wallClock !== parsedB.wallClock) {
      return parsedA.wallClock < parsedB.wallClock ? -1 : 1;
    }
    if (parsedA.counter !== parsedB.counter) {
      return parsedA.counter < parsedB.counter ? -1 : 1;
    }
    if (parsedA.nodeId !== parsedB.nodeId) {
      return parsedA.nodeId < parsedB.nodeId ? -1 : 1;
    }
    return 0;
  }

  /**
   * Parse an HLC timestamp string.
   */
  static parse(timestamp: string): {
    wallClock: number;
    counter: number;
    nodeId: string;
  } {
    const parts = timestamp.split(':');
    return {
      wallClock: parseInt(parts[0] || '0', 10),
      counter: parseInt(parts[1] || '0', 10),
      nodeId: parts[2] || '',
    };
  }

  private toString(): string {
    return `${this.wallClock}:${this.counter}:${this.nodeId}`;
  }

  private generateNodeId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
