#!/usr/bin/env node

/**
 * Getnayi high-fidelity Load Testing Utility
 * Optimized for high performance, zero external dependencies, and beautiful presentation.
 * 
 * Usage:
 *   node loadtester.js [url] [concurrency] [duration_seconds]
 * Example:
 *   node loadtester.js http://localhost:3000/api/health 10 5
 */

import http from 'http';
import { URL } from 'url';

// Parse command line arguments
const args = process.argv.slice(2);
const targetUrlString = args[0] || 'http://localhost:3000/api/health';
const concurrency = parseInt(args[1] || '10', 10);
const durationSeconds = parseInt(args[2] || '5', 10);

// ANSI color codes for premium console output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bgDark: '\x1b[48;5;234m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function printHeader() {
  console.clear();
  console.log(`${colors.bold}${colors.cyan}┌────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}│             GETNAYI HIGH-PERFORMANCE LOAD TESTER       │${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}└────────────────────────────────────────────────────────┘${colors.reset}`);
  console.log(`${colors.dim}Target URL:    ${colors.reset}${colors.bold}${colors.green}${targetUrlString}${colors.reset}`);
  console.log(`${colors.dim}Concurrency:   ${colors.reset}${colors.bold}${concurrency} concurrent workers${colors.reset}`);
  console.log(`${colors.dim}Duration:      ${colors.reset}${colors.bold}${durationSeconds} seconds${colors.reset}`);
  console.log(`${colors.dim}Status:        ${colors.reset}${colors.yellow}Initializing test suite...${colors.reset}\n`);
}

// Stats collectors
let totalRequests = 0;
let successCount = 0;
let failureCount = 0;
const statusCodes = {};
const latencies = [];
let startTime = Date.now();
let keepRunning = true;

// Parse the target URL
let parsedUrl;
try {
  parsedUrl = new URL(targetUrlString);
} catch (e) {
  console.error(`${colors.red}Error: Invalid target URL provided: "${targetUrlString}"${colors.reset}`);
  process.exit(1);
}

// Worker function
async function runWorker(workerId) {
  while (keepRunning) {
    const requestStartTime = process.hrtime();
    totalRequests++;

    await new Promise((resolve) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'GetnayiLoadTester/1.0.0',
          'Accept': '*/*',
          'Connection': 'keep-alive',
        },
        timeout: 5000, // 5 second timeout
      };

      const req = http.request(options, (res) => {
        // Record status code
        const code = res.statusCode;
        statusCodes[code] = (statusCodes[code] || 0) + 1;

        // Standard 2xx/3xx are successes
        if (code >= 200 && code < 400) {
          successCount++;
        } else {
          failureCount++;
        }

        // Consume response data to free up sockets
        res.on('data', () => {});
        res.on('end', () => {
          const diff = process.hrtime(requestStartTime);
          const durationMs = (diff[0] * 1000) + (diff[1] / 1000000);
          latencies.push(durationMs);
          resolve();
        });
      });

      req.on('error', (err) => {
        failureCount++;
        const errorType = err.code || 'UNKNOWN_ERROR';
        statusCodes[errorType] = (statusCodes[errorType] || 0) + 1;
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        failureCount++;
        statusCodes['TIMEOUT'] = (statusCodes['TIMEOUT'] || 0) + 1;
        resolve();
      });

      req.end();
    });
  }
}

// Orchestrator
async function run() {
  printHeader();

  // Start workers
  const workerPromises = [];
  startTime = Date.now();
  for (let i = 0; i < concurrency; i++) {
    workerPromises.push(runWorker(i));
  }

  // Set up progress reporting interval
  const updateInterval = setInterval(() => {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rps = (totalRequests / elapsedSec).toFixed(1);
    const progressPercent = Math.min(100, Math.floor((elapsedSec / durationSeconds) * 100));
    
    // Simple command-line progress bar
    const barWidth = 30;
    const filledWidth = Math.floor((progressPercent / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

    process.stdout.write(
      `\r[${colors.cyan}${bar}${colors.reset}] ${progressPercent}% | RPS: ${colors.bold}${colors.green}${rps}${colors.reset} | Req: ${colors.bold}${totalRequests}${colors.reset} | Success: ${colors.green}${successCount}${colors.reset} | Fail: ${colors.red}${failureCount}${colors.reset}`
    );
  }, 100);

  // Stop after specified duration
  await new Promise((resolve) => {
    setTimeout(() => {
      keepRunning = false;
      clearInterval(updateInterval);
      resolve();
    }, durationSeconds * 1000);
  });

  // Wait for all workers to complete current request
  await Promise.all(workerPromises);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  printResults(totalTimeSec);
}

function printResults(totalTimeSec) {
  // Sort latencies for percentiles
  latencies.sort((a, b) => a - b);
  const count = latencies.length;

  const min = count > 0 ? latencies[0].toFixed(1) : '0';
  const max = count > 0 ? latencies[count - 1].toFixed(1) : '0';
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = count > 0 ? (sum / count).toFixed(1) : '0';

  // Percentiles
  const p50 = count > 0 ? latencies[Math.floor(count * 0.50)].toFixed(1) : '0';
  const p90 = count > 0 ? latencies[Math.floor(count * 0.90)].toFixed(1) : '0';
  const p95 = count > 0 ? latencies[Math.floor(count * 0.95)].toFixed(1) : '0';
  const p99 = count > 0 ? latencies[Math.floor(count * 0.99)].toFixed(1) : '0';

  const rps = (totalRequests / totalTimeSec).toFixed(1);
  const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : '0';

  console.log('\n\n');
  console.log(`${colors.bold}${colors.cyan}┌────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}│                     TEST COMPLETED                     │${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}└────────────────────────────────────────────────────────┘${colors.reset}`);
  
  // High-fidelity performance metrics table
  console.log(`${colors.bold}  KEY PERFORMANCE INDICATORS:${colors.reset}`);
  console.log(`  ────────────────────────────────────────────────────────`);
  console.log(`  Total Duration:     ${colors.bold}${totalTimeSec.toFixed(2)} seconds${colors.reset}`);
  console.log(`  Total Requests:     ${colors.bold}${totalRequests}${colors.reset}`);
  console.log(`  Throughput (RPS):   ${colors.bold}${colors.green}${rps} req/sec${colors.reset}`);
  console.log(`  Success Rate:       ${colors.bold}${successRate}%${colors.reset} (${successCount} successful, ${failureCount} failed)`);
  console.log(`  ────────────────────────────────────────────────────────\n`);

  console.log(`${colors.bold}  LATENCY METRICS (ms):${colors.reset}`);
  console.log(`  ────────────────────────────────────────────────────────`);
  console.log(`  Minimum Latency:    ${colors.bold}${colors.cyan}${min} ms${colors.reset}`);
  console.log(`  Average Latency:    ${colors.bold}${colors.cyan}${avg} ms${colors.reset}`);
  console.log(`  Maximum Latency:    ${colors.bold}${colors.red}${max} ms${colors.reset}`);
  console.log(`  ────────────────────────────────────────────────────────`);
  console.log(`  P50 (Median):       ${colors.bold}${p50} ms${colors.reset}`);
  console.log(`  P90 (90% <=):       ${colors.bold}${p90} ms${colors.reset}`);
  console.log(`  P95 (95% <=):       ${colors.bold}${p95} ms${colors.reset}`);
  console.log(`  P99 (99% <=):       ${colors.bold}${p99} ms${colors.reset}`);
  console.log(`  ────────────────────────────────────────────────────────\n`);

  console.log(`${colors.bold}  STATUS CODE BREAKDOWN:${colors.reset}`);
  console.log(`  ────────────────────────────────────────────────────────`);
  Object.keys(statusCodes).forEach((code) => {
    const codeCount = statusCodes[code];
    const codePercent = ((codeCount / totalRequests) * 100).toFixed(1);
    const isSuccess = !isNaN(code) && parseInt(code, 10) >= 200 && parseInt(code, 10) < 400;
    const color = isSuccess ? colors.green : colors.red;
    console.log(`  HTTP [${color}${code}${colors.reset}]:          ${colors.bold}${codeCount}${colors.reset} requests (${codePercent}%)`);
  });
  console.log(`  ────────────────────────────────────────────────────────\n`);
  
  if (failureCount === 0) {
    console.log(`  ${colors.bgGreen}${colors.bold} PASS ${colors.reset} ${colors.green}All requests completed successfully with high availability.${colors.reset}\n`);
  } else {
    console.log(`  ${colors.bgRed}${colors.bold} WARN ${colors.reset} ${colors.yellow}Detected ${failureCount} request failures during peak load testing.${colors.reset}\n`);
  }
}

run().catch((err) => {
  console.error(`${colors.red}Load test orchestrator crashed:`, err, colors.reset);
  process.exit(1);
});
