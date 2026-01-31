/**
 * Simple Browser-Compatible Event Emitter
 * 
 * Lightweight event emitter that works in the browser without Node.js dependencies.
 */

type EventHandler = (...args: any[]) => void;

export class EventEmitter {
    private events: Map<string, EventHandler[]>;

    constructor() {
        this.events = new Map();
    }

    /**
     * Register an event listener
     */
    on(event: string, handler: EventHandler): this {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const handlers = this.events.get(event)!;
        handlers.push(handler);

        return this;
    }

    /**
     * Register a one-time event listener
     */
    once(event: string, handler: EventHandler): this {
        const onceHandler = (...args: any[]) => {
            handler(...args);
            this.off(event, onceHandler);
        };

        return this.on(event, onceHandler);
    }

    /**
     * Remove an event listener
     */
    off(event: string, handler: EventHandler): this {
        const handlers = this.events.get(event);

        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }

            if (handlers.length === 0) {
                this.events.delete(event);
            }
        }

        return this;
    }

    /**
     * Emit an event
     */
    emit(event: string, ...args: any[]): boolean {
        const handlers = this.events.get(event);

        if (handlers && handlers.length > 0) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
            });
            return true;
        }

        return false;
    }

    /**
     * Remove all listeners for an event or all events
     */
    removeAllListeners(event?: string): this {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }

        return this;
    }

    /**
     * Get number of listeners for an event
     */
    listenerCount(event: string): number {
        const handlers = this.events.get(event);
        return handlers ? handlers.length : 0;
    }

    /**
     * Get all event names
     */
    eventNames(): string[] {
        return Array.from(this.events.keys());
    }
}
