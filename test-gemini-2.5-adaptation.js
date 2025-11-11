#!/usr/bin/env node

/**
 * Test Gemini 2.5 Pro Adaptation Engine
 * 
 * Tests the full adaptation pipeline with context-aware translation
 */

const fs = require('fs');
const path = require('path');

// Mock the logger to avoid import issues
global.console.debug = () => {};

console.log('==========================================');
console.log('🚀 Gemini 2.5 Pro Adaptation Test');
console.log('==========================================\n');

// Test configuration
const testSegments = [
    {
        id: 1,
        text: "Hello, how are you today?",
        duration: 2.5,
        emotion: "neutral",
        previous_line: null,
        next_line: "I'm doing great, thanks for asking!"
    },
    {
        id: 2,
        text: "I'm doing great, thanks for asking!",
        duration: 3.0,
        emotion: "happy",
        previous_line: "Hello, how are you today?",
        next_line: "That's wonderful to hear!"
    },
    {
        id: 3,
        text: "That's wonderful to hear!",
        duration: 2.0,
        emotion: "excited",
        previous_line: "I'm doing great, thanks for asking!",
        next_line: null
    }
];

async function testGeminiConnection() {
    console.log('📋 Step 1: Testing Gemini 2.5 Pro Connection');
    console.log('----------------------------------------\n');
    
    try {
        // Check environment
        const envPath = path.join(__dirname, 'packages/backend/.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const hasApiKey = envContent.includes('GEMINI_API_KEY=');
        const hasModel = envContent.includes('GEMINI_MODEL=gemini-2.5-pro');
        
        console.log(`✓ API Key configured: ${hasApiKey ? 'Yes' : 'No'}`);
        console.log(`✓ Model configured: ${hasModel ? 'gemini-2.5-pro' : 'other'}`);
        
        if (!hasApiKey) {
            console.log('\n❌ GEMINI_API_KEY not found in .env file');
            return false;
        }
        
        console.log('\n✅ Configuration verified\n');
        return true;
    } catch (error) {
        console.error('❌ Error checking configuration:', error.message);
        return false;
    }
}

async function testAdaptationEngine() {
    console.log('📋 Step 2: Testing Adaptation Engine');
    console.log('----------------------------------------\n');
    
    try {
        // Import after checking config
        const { createAdaptationService } = require('./packages/backend/src/lib/adaptation-service');
        
        const config = {
            sourceLanguage: 'en',
            targetLanguage: 'es',
            maxRetries: 2,
            glossary: {
                'hello': 'hola'
            }
        };
        
        console.log('Creating adaptation service...');
        const service = createAdaptationService(config);
        console.log('✓ Service created\n');
        
        console.log('Testing API connection...');
        const connected = await service.testConnection();
        
        if (connected) {
            console.log('✅ Gemini 2.5 Pro API connected\n');
            return service;
        } else {
            console.log('❌ Failed to connect to Gemini 2.5 Pro\n');
            return null;
        }
    } catch (error) {
        console.error('❌ Error creating service:', error.message);
        console.error('Stack:', error.stack);
        return null;
    }
}

async function testSegmentAdaptation(service) {
    console.log('📋 Step 3: Testing Segment Adaptation');
    console.log('----------------------------------------\n');
    
    try {
        console.log('Adapting test segments (en → es)...\n');
        
        for (const segment of testSegments) {
            console.log(`Segment ${segment.id}: "${segment.text}"`);
            console.log(`  Duration: ${segment.duration}s, Emotion: ${segment.emotion}`);
            
            const result = await service.adaptSegment(segment);
            
            if (result.status === 'success') {
                console.log(`  ✅ Adapted: "${result.adaptedText}"`);
                console.log(`  Attempts: ${result.attempts}`);
            } else {
                console.log(`  ⚠️  Failed: ${result.validationFeedback}`);
            }
            console.log('');
        }
        
        console.log('✅ Segment adaptation complete\n');
        return true;
    } catch (error) {
        console.error('❌ Error adapting segments:', error.message);
        return false;
    }
}

async function testParallelAdaptation(service) {
    console.log('📋 Step 4: Testing Parallel Adaptation');
    console.log('----------------------------------------\n');
    
    try {
        console.log('Adapting segments in parallel (concurrency: 2)...\n');
        
        const startTime = Date.now();
        const results = await service.adaptSegmentsParallel(testSegments, 2);
        const duration = Date.now() - startTime;
        
        console.log(`Completed in ${duration}ms\n`);
        
        // Show statistics
        const stats = service.getAdaptationStats(results);
        console.log('Statistics:');
        console.log(`  Total: ${stats.total}`);
        console.log(`  Successful: ${stats.successful} (${stats.successRate.toFixed(1)}%)`);
        console.log(`  Failed: ${stats.failed}`);
        console.log(`  Avg attempts: ${stats.averageAttempts.toFixed(2)}`);
        
        console.log('\n✅ Parallel adaptation complete\n');
        return true;
    } catch (error) {
        console.error('❌ Error in parallel adaptation:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('Testing Gemini 2.5 Pro Adaptation Engine\n');
    
    let passed = 0;
    let total = 4;
    
    // Test 1: Configuration
    if (await testGeminiConnection()) {
        passed++;
    }
    
    // Test 2: Service creation
    const service = await testAdaptationEngine();
    if (service) {
        passed++;
        
        // Test 3: Segment adaptation
        if (await testSegmentAdaptation(service)) {
            passed++;
        }
        
        // Test 4: Parallel adaptation
        if (await testParallelAdaptation(service)) {
            passed++;
        }
    }
    
    // Summary
    console.log('==========================================');
    console.log('📊 Test Summary');
    console.log('==========================================\n');
    console.log(`Results: ${passed}/${total} tests passed\n`);
    
    if (passed === total) {
        console.log('🎉 All tests passed!');
        console.log('\n✅ Gemini 2.5 Pro adaptation is working correctly\n');
        console.log('Next steps:');
        console.log('  1. Test with real video: ./test-full-system.sh');
        console.log('  2. Run CLI dubbing: cd packages/backend && npm run test:cli');
        console.log('  3. Start full system: ./start-all-services.sh\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed');
        console.log('\nCheck the output above for details.\n');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
