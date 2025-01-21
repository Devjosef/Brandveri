/**
 * Custom assertion helpers, for common test scenarios.
 */

export const assertSuccessResponse = (response: any) => {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  };
  
  export const assertErrorResponse = (response: any, expectedCode: string) => {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('code', expectedCode);
  };
  
  export const assertValidationError = (response: any, field: string) => {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toContainEqual(
      expect.objectContaining({ field })
    );
  };