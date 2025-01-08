import type { GitHubRepository, SoftwareCopyright, License } from '../../../types/copyright';

/**
 * Transforms GitHub repository data into our domain model
 */
export function transformRepository(repo: GitHubRepository): SoftwareCopyright['repository'] {
    return {
        url: repo.html_url,
        owner: repo.owner.login,
        name: repo.name,
        stars: repo.stargazers_count,
        createdAt: new Date(repo.created_at),
        lastUpdated: new Date(repo.updated_at)
    };
}

/**
 * Transforms license data from GitHub format to our domain model
 */
export function transformLicense(license: GitHubRepository['license']): License | null {
    if (!license) return null;

    return {
        type: license.spdx_id || 'UNKNOWN',
        url: license.url,
        permissions: [], // Could be populated based on SPDX identifier
        limitations: []  // Could be populated based on SPDX identifier
    };
}

/**
 * Transforms copyright status based on repository data
 */
export function transformCopyrightStatus(repo: GitHubRepository): SoftwareCopyright['copyrightStatus'] {
    return {
        isProtected: true, // Copyright is automatic upon creation
        creationDate: new Date(repo.created_at),
        jurisdiction: 'Worldwide', // Copyright is generally worldwide
        explanation: 'Software is automatically protected by copyright upon creation'
    };
}