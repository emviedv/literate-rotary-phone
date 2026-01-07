export declare function testCase(name: string, fn: () => void | Promise<void>): void;
export declare function assert(condition: boolean, message?: string): void;
export declare function assertEqual<T>(actual: T, expected: T, message?: string): void;
