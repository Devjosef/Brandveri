import TrademarkSearch from '../../../database/models/trademarkSearch';

/**
 * Formats the trademark response for client consumption.
 * @param data - The raw trademark data from the database.
 * @returns A formatted trademark object.
 */
export function formatTrademarkResponse(data: TrademarkSearch): any {
    return {
        id: data.id,
        name: data.searchTerm,
        owner: data.userId, // Assuming userId represents the owner
        searchDate: data.searchDate,
        results: data.results,
    };
}

/**
 * Validates trademark data before processing.
 * @param data - The trademark data to validate.
 * @returns True if valid, throws an error otherwise.
 */
export function validateTrademarkData(data: any): boolean {
    if (!data.searchTerm || typeof data.searchTerm !== 'string') {
        throw new Error('Invalid search term');
    }
    // Add more validation rules as needed
    return true;
}

/**
 * Logs trademark operations for auditing purposes.
 * @param operation - The operation being performed.
 * @param data - The data involved in the operation.
 */
export function logTrademarkOperation(operation: string, data: any): void {
    console.log(`Operation: ${operation}, Data: ${JSON.stringify(data)}`);
    // Implement more sophisticated logging if needed
}