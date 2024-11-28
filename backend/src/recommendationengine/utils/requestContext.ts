import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextData {
    correlationId: string;
    startTime: number;
    userId?: string;
}

export class RequestContext {
    private static storage = new AsyncLocalStorage<RequestContextData>();

    constructor(correlationId: string) {
        RequestContext.storage.enterWith({
            correlationId,
            startTime: Date.now()
        });
    }

    static getCurrentContext(): RequestContextData | undefined {
        return this.storage.getStore();
    }

    clear(): void {
        RequestContext.storage.disable();
    }
}