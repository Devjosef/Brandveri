import { GitHubUtility } from '../utils/githubUtility';
import { CopyrightTransformer } from '../utils/copyrightTransformer';
import { CopyrightValidator } from '../utils/copyrightValidator';
import { copyrightCache } from '../../utils/cache';
import { RequestContext } from '../../utils/requestContext';
import { loggers } from '../../../observability/contextLoggers';
import { 
    ApiResponse, 
    SoftwareSearchResult, 
    ServiceHealth,
    CopyrightMetrics,
    CopyrightService as ICopyrightService,
    SoftwareSearchParams,
    CopyrightErrorCode
} from '../../../types/copyright';
import { GitHubConfig } from '../../../types/github';

const logger = loggers.copyright;

// GitHub configuration with proper typing
const defaultGitHubConfig: GitHubConfig = {
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    token: process.env.GITHUB_TOKEN || '',
    rateLimit: {
        maxRequests: parseInt(process.env.GITHUB_RATE_LIMIT || '5000', 10),
        perMilliseconds: 3600000 // 1 hour in milliseconds
    },
    retry: {
        attempts: parseInt(process.env.GITHUB_RETRY_ATTEMPTS || '3', 10),
        backoff: true
    },
    timeout: parseInt(process.env.GITHUB_TIMEOUT || '10000', 10),
    maxItemsPerSearch: parseInt(process.env.GITHUB_MAX_ITEMS || '100', 10)
};

export class CopyrightService implements ICopyrightService {
    private readonly github: GitHubUtility;
    private readonly transformer: CopyrightTransformer;
    private readonly validator: CopyrightValidator;

    constructor(config: GitHubConfig = defaultGitHubConfig) {
        if (!config.token) {
            throw new Error('GitHub token is required');
        }

        this.github = new GitHubUtility(config);
        this.transformer = new CopyrightTransformer();
        this.validator = new CopyrightValidator();
    }

    async searchCopyright(
        query: string,
        params?: Partial<SoftwareSearchParams>
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = RequestContext.getCurrentContext();
        const requestId = context?.correlationId || crypto.randomUUID();

        try {
            const validatedQuery = this.validator.validateSearchQuery(query, params);
            const cacheKey = `software:${validatedQuery.query}:${JSON.stringify(validatedQuery.params)}`;
            
            // Cache check with proper typing
            const cached = await copyrightCache.get<SoftwareSearchResult>(cacheKey);
            if (cached) {
                return this.transformer.createApiResponse(cached, requestId);
            }

            // Search with validated parameters
            const repositories = await this.github.search(
                validatedQuery.query,
                validatedQuery.params
            );

            const results = repositories.map((repo: string) => 
                this.transformer.transformGithubData(repo)
            );

            await copyrightCache.set(cacheKey, results);

            return this.transformer.createApiResponse(results, requestId);

        } catch (error) {
            logger.error({ 
                error, 
                query, 
                params, 
                requestId,
                errorCode: this.determineErrorCode(error)
            }, 'Search failed');
            
            throw this.transformError(error, requestId);
        }
    }

    async getRepositoryDetails(
        owner: string, 
        repo: string
    ): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = RequestContext.getCurrentContext();
        const requestId = context?.correlationId || crypto.randomUUID();

        try {
            const validated = this.validator.validateRepoParams(owner, repo);
            const cacheKey = `repo:${validated.owner}/${validated.repo}`;

            // Cache check with proper typing
            const cached = await copyrightCache.get<SoftwareSearchResult>(cacheKey);
            if (cached) {
                return this.transformer.createApiResponse(cached, requestId);
            }

            const repository = await this.github.getRepository(
                validated.owner, 
                validated.repo
            );
            
            const result = this.transformer.transformGithubData(repository);
            await copyrightCache.set(cacheKey, [result]);

            return this.transformer.createApiResponse([result], requestId);

        } catch (error) {
            logger.error({ 
                error, 
                owner, 
                repo, 
                requestId,
                errorCode: this.determineErrorCode(error)
            }, 'Get details failed');
            
            throw this.transformError(error, requestId);
        }
    }

    async getServiceHealth(): Promise<ServiceHealth> {
        return this.github.getHealth();
    }

    getMetrics(): CopyrightMetrics {
        return this.github.getMetrics();
    }

    private determineErrorCode(error: unknown): CopyrightErrorCode {
        if (error instanceof Error) {
            if (error.message.includes('rate limit')) {
                return CopyrightErrorCode.RATE_LIMIT_ERROR;
            }
            if (error.message.includes('not found')) {
                return CopyrightErrorCode.NOT_FOUND;
            }
            if (error.message.includes('validation')) {
                return CopyrightErrorCode.VALIDATION_ERROR;
            }
            if (error.message.includes('circuit breaker')) {
                return CopyrightErrorCode.CIRCUIT_BREAKER_ERROR;
            }
        }
        return CopyrightErrorCode.UNKNOWN_ERROR;
    }

    private transformError(error: unknown, requestId: string): Error {
        const errorCode = this.determineErrorCode(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return Object.assign(new Error(errorMessage), {
            code: errorCode,
            requestId,
            timestamp: new Date().toISOString()
        });
    }
}
