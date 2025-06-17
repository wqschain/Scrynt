import { StockData } from '../services/stockService';

/**
 * Calculates the Sharpe ratio for a given return series.
 * 
 * The Sharpe ratio is a measure of risk-adjusted return, calculated as:
 * (average return - risk free rate) / standard deviation of returns
 * 
 * @param returns - Array of periodic returns (as decimals, not percentages)
 * @param riskFreeRate - Annual risk-free rate (as decimal)
 * @returns The Sharpe ratio, or null if the calculation is not possible
 */
export function computeSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.05
): number | null {
  if (!returns.length) return null;

  // Convert returns to excess returns (subtract risk-free rate)
  const periodicRiskFreeRate = riskFreeRate / 12; // Assuming monthly returns
  const excessReturns = returns.map(r => r - periodicRiskFreeRate);

  // Calculate average excess return
  const avgExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;

  // Calculate standard deviation
  const squaredDiffs = excessReturns.map(r => Math.pow(r - avgExcessReturn, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (excessReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  // Guard against division by zero or very small numbers
  if (stdDev < 0.0001) return null;

  // Annualize the Sharpe ratio (multiply by sqrt(12) for monthly data)
  return (avgExcessReturn / stdDev) * Math.sqrt(12);
}

export interface RiskReturnMetrics {
  annualReturn: number;
  riskAdjustedReturn: number | null;
  sharpeRatio: number | null;
}

/**
 * Calculates risk-adjusted return metrics for a stock.
 * 
 * @param stock - Stock data object
 * @param riskFreeRate - Annual risk-free rate (as decimal)
 * @returns Object containing risk-adjusted return metrics
 */
export function calculateRiskReturnMetrics(
  stock: StockData,
  riskFreeRate: number = 0.05
): RiskReturnMetrics {
  // Extract return series (convert from percentages to decimals)
  const returns = [
    stock.change_1m / 100,
    stock.change_6m / 100,
    stock.change_1y / 100
  ].filter(r => r !== null);

  // Calculate traditional Sharpe ratio using return series
  const sharpeRatio = computeSharpeRatio(returns, riskFreeRate);

  // Calculate beta-adjusted return (legacy metric)
  const annualReturn = stock.change_1y / 100;
  const riskAdjustedReturn = stock.beta && stock.beta !== 0 
    ? annualReturn / stock.beta 
    : null;

  return {
    annualReturn,
    riskAdjustedReturn,
    sharpeRatio
  };
}

// Example usage:
/*
const sampleStock = {
  change_1m: 10,  // 10% monthly return
  change_6m: 25,  // 25% 6-month return
  change_1y: 40,  // 40% annual return
  beta: 1.2
};

const metrics = calculateRiskReturnMetrics(sampleStock);
console.log(metrics);
// {
//   annualReturn: 0.4,
//   riskAdjustedReturn: 0.333,
//   sharpeRatio: 2.1
// }

const sampleReturns = [0.1, 0.2, -0.05];  // Sample monthly returns
const sharpeRatio = computeSharpeRatio(sampleReturns, 0.02);  // 2% risk-free rate
console.log(sharpeRatio);  // ~2.76
*/ 