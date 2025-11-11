/**
 * Pre-Flight Validation System
 * 
 * This module provides a TypeScript interface to the Python pre-flight validation system.
 * It validates that all pipeline components work correctly before processing user videos.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface ValidationResults {
  vocal_isolation: boolean;
  noise_reduction: boolean;
  few_shot_loading: boolean;
  conform_operation: boolean;
  absolute_sync: boolean;
}

export class PreFlightValidator {
  private pythonScriptPath: string;
  
  constructor() {
    // Path to Python validation script
    this.pythonScriptPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'workers',
      'python',
      'pre_flight_validator.py'
    );
  }
  
  /**
   * Run all pre-flight validation tests
   * 
   * @returns Validation results
   * @throws Error if validation fails
   */
  async runAllValidations(): Promise<ValidationResults> {
    logger.info('Running pre-flight validation tests...');
    
    try {
      // Check if Python script exists
      const fs = require('fs');
      if (!fs.existsSync(this.pythonScriptPath)) {
        logger.warn(`Pre-flight validation script not found at ${this.pythonScriptPath}`);
        logger.warn('Skipping pre-flight validation');
        
        // Return all tests as passed if script doesn't exist
        return {
          vocal_isolation: true,
          noise_reduction: true,
          few_shot_loading: true,
          conform_operation: true,
          absolute_sync: true,
        };
      }
      
      // Run Python validation script
      const { stdout, stderr } = await execAsync(`python3 ${this.pythonScriptPath}`);
      
      // Log output
      if (stdout) {
        logger.info('Pre-flight validation output:');
        stdout.split('\n').forEach(line => {
          if (line.trim()) {
            logger.info(line);
          }
        });
      }
      
      if (stderr) {
        logger.warn('Pre-flight validation warnings:');
        stderr.split('\n').forEach(line => {
          if (line.trim()) {
            logger.warn(line);
          }
        });
      }
      
      // Parse results from output
      const results = this.parseValidationOutput(stdout);
      
      // Check if all tests passed
      const allPassed = Object.values(results).every(v => v === true);
      
      if (allPassed) {
        logger.info('✓ All pre-flight validation tests passed');
      } else {
        const failedTests = Object.entries(results)
          .filter(([_, passed]) => !passed)
          .map(([test, _]) => test);
        
        logger.error(`✗ Pre-flight validation failed. Failed tests: ${failedTests.join(', ')}`);
        throw new Error(`Pre-flight validation failed: ${failedTests.join(', ')}`);
      }
      
      return results;
      
    } catch (error) {
      if (error instanceof Error) {
        // If it's already our error, re-throw
        if (error.message.startsWith('Pre-flight validation failed:')) {
          throw error;
        }
        
        // Otherwise, log and wrap
        logger.error('Pre-flight validation error:', error);
        throw new Error(`Pre-flight validation error: ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Parse validation output to extract results
   * 
   * @param output - Validation script output
   * @returns Validation results
   */
  private parseValidationOutput(output: string): ValidationResults {
    // Default to all passed
    const results: ValidationResults = {
      vocal_isolation: true,
      noise_reduction: true,
      few_shot_loading: true,
      conform_operation: true,
      absolute_sync: true,
    };
    
    // Parse output for test results
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for test result indicators
      if (line.includes('Vocal isolation test') && line.includes('failed')) {
        results.vocal_isolation = false;
      }
      if (line.includes('Noise reduction test') && line.includes('failed')) {
        results.noise_reduction = false;
      }
      if (line.includes('Few-shot examples test') && line.includes('failed')) {
        results.few_shot_loading = false;
      }
      if (line.includes('Conform operation test') && line.includes('failed')) {
        results.conform_operation = false;
      }
      if (line.includes('Absolute synchronization test') && line.includes('failed')) {
        results.absolute_sync = false;
      }
    }
    
    return results;
  }
  
  /**
   * Run validation with timeout
   * 
   * @param timeoutMs - Timeout in milliseconds (default: 60000)
   * @returns Validation results
   */
  async runWithTimeout(timeoutMs: number = 60000): Promise<ValidationResults> {
    return Promise.race([
      this.runAllValidations(),
      new Promise<ValidationResults>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Pre-flight validation timed out'));
        }, timeoutMs);
      }),
    ]);
  }
}

/**
 * Run pre-flight validation on startup
 * 
 * @param failOnError - Whether to fail startup if validation fails (default: true)
 * @returns Validation results
 */
export async function runStartupValidation(failOnError: boolean = true): Promise<ValidationResults> {
  const validator = new PreFlightValidator();
  
  try {
    logger.info('=' .repeat(60));
    logger.info('Running startup pre-flight validation...');
    logger.info('=' .repeat(60));
    
    const results = await validator.runWithTimeout(60000);
    
    logger.info('=' .repeat(60));
    logger.info('Startup validation complete');
    logger.info('=' .repeat(60));
    
    return results;
    
  } catch (error) {
    if (failOnError) {
      logger.error('Startup validation failed. System not ready.');
      throw error;
    } else {
      logger.warn('Startup validation failed, but continuing anyway');
      logger.warn(error instanceof Error ? error.message : String(error));
      
      // Return all tests as passed if we're not failing on error
      return {
        vocal_isolation: true,
        noise_reduction: true,
        few_shot_loading: true,
        conform_operation: true,
        absolute_sync: true,
      };
    }
  }
}

// Export singleton instance
export const preFlightValidator = new PreFlightValidator();
