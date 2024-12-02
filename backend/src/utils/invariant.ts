//  Provides runtime assertion, to catch programming errors and invalid states early.
//  TypeScript compiler uses return type, to narrow types in code following assertion.
export function invariant(
    condition: boolean, 
    message: string
): asserts condition {
    // Throw error with a descriptive message when assertion fails.
    if (!condition) {
        throw new Error(`Invariant violation: ${message}`);
    }
}