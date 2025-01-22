export interface BaseFixture {
  validCases: Record<string, unknown>;
  edgeCases: Record<string, unknown>;
  invalidCases: Record<string, unknown>;
}

// Only keep specific types we actually use in tests
export interface TrademarkCase {
  name: string;
  niceClasses: number[];
  status: string;
}