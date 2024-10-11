import axios from 'axios';
import { escape } from 'validator';

/**
 * Validate user input for recommendation engine.
 * @param industry - The industry of the business.
 * @param keywords - List of keywords to generate brand names.
 * @returns Boolean indicating if the input is valid or not.
 */
export const validateRecommendationInput = (
    industry: string,
    keywords: string[]
): boolean => {
    // Ensure the industry is a non-empty string
    if (!industry || typeof industry !== 'string' || industry.trim().length === 0) {
        console.error({ message: 'Invalid input: Industry must be a non-empty string.', industry });
        return false;
    }

    // Ensure keywords is a non-empty array and each element is a non-empty string
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        console.error('Invalid input: Keywords must be a non-empty array of strings.');
        return false;
    }

    for (const keyword of keywords) {
        if (typeof keyword !== 'string' || keyword.trim().length === 0) {
            console.error('Invalid input: Each keyword must be a non-empty string.', { keyword });
            return false; // Invalid keyword found
        }
    }

    return true;
};

/**
 * Sanitize user input to prevent injection attacks or unintended API behavior.
 * @param input - The input string to be sanitized.
 * @returns Sanitized input.
 */
export const sanitizeInput = (input: string): string => {
    return escape(input.trim()); // Escapes potentially harmful HTML characters
};

/**
 * Check that all necessary environment variables are set before the application runs.
 */
export const checkEnvironmentVariables = (): void => {
    const requiredVariables = ['OPENAI_API_KEY', 'ANOTHER_API_KEY'];
    requiredVariables.forEach((variable) => {
        if (!process.env[variable]) {
            throw new Error(`Missing required environment variable: ${variable}`);
        }
    });
};

/**
 * Format the input data to be compatible with OpenAI's API.
 * @param industry - The industry of the business.
 * @param keywords - List of keywords to generate brand names.
 * @returns Formatted input as a string for OpenAI.
 */
export const formatInputForAI = (industry: string, keywords: string[]): string => {
    // Sanitize inputs
    const sanitizedIndustry = sanitizeInput(industry);
    const sanitizedKeywords = keywords.map(sanitizeInput);

    const keywordString = sanitizedKeywords.join(', ');

    // Format prompt according to OpenAI's best practices
    return `Generate unique, memorable, and relevant brand names for a ${sanitizedIndustry} business. Use the following keywords for inspiration: ${keywordString}. Please provide creative and brandable names.`;
};

/**
 * Function to call OpenAI API for brand name recommendations.
 * @param prompt - The formatted prompt for OpenAI API.
 * @returns A list of recommended brand names.
 */
export const getBrandRecommendations = async (prompt: string): Promise<string[]> => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'text-davinci-003',
                prompt,
                max_tokens: 100,
                n: 5, // Number of suggestions
                temperature: 0.7, // Controls creativity of response
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 5000, // Timeout after 5 seconds
            }
        );

        // Validate response structure before accessing data
        if (!response.data || !Array.isArray(response.data.choices)) {
            throw new Error('Unexpected response format from OpenAI API.');
        }

        // Extract the suggestions from the response
        const recommendations = response.data.choices.map(
            (choice: { text: string }) => choice.text.trim()
        );

        return recommendations;
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            // Log specific network or API errors
            console.error('API error occurred:', error.message); // Mask sensitive info
        } else if (error.response) {
            // Log the API response error (without sensitive info)
            console.error('API response error:', error.response.data);
        } else {
            // Handle any other unexpected errors
            console.error('Unexpected error:', error.message);
        }

        throw new Error('Failed to fetch brand name recommendations. Please try again later.');
    }
};