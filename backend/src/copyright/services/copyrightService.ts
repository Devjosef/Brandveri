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
    CopyrightMetrics 
} from '../../../types/copyright';

const logger = loggers.copyright;

export class CopyrightService {
    private readonly github: GitHubUtility;
    private readonly transformer: CopyrightTransformer;
    private readonly validator: CopyrightValidator;

    constructor() {
        this.github = new GitHubUtility();
        this.transformer = new CopyrightTransformer();
        this.validator = new CopyrightValidator();
    }

    async searchCopyright(query: string): Promise<ApiResponse<SoftwareSearchResult>> {
        const context = RequestContext.getCurrentContext();
        const requestId = context?.correlationId || crypto.randomUUID();

        try {
            const validatedQuery = this.validator.validateSearchQuery(query);
            const cacheKey = `software:${validatedQuery.query}`;
            const cached = await copyrightCache.get<SoftwareSearchResult>(cacheKey);
            if (cached) {
                return this.transformer.createApiResponse(cached, requestId);
            }

            const repositories = await this.github.search(validatedQuery.query);
            const results = repositories.map(repo => 
                this.transformer.transformGithubData(repo)
            );

            await copyrightCache.set(cacheKey, results);

            return this.transformer.createApiResponse(results, requestId);

        } catch (error) {
            logger.error({ error, query, requestId }, 'Search failed');
            throw error;
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
            const repository = await this.github.getRepository(
                validated.owner, 
                validated.repo
            );
            const result = this.transformer.transformGithubData(repository);

            return this.transformer.createApiResponse([result], requestId);

        } catch (error) {
            logger.error({ error, owner, repo, requestId }, 'Get details failed');
            throw error;
        }
    }

    async getServiceHealth(): Promise<ServiceHealth> {
        return this.github.getHealth();
    }

    getMetrics(): CopyrightMetrics {
        return this.github.getMetrics();
    }
}
